# 1. System Architecture

## High-level diagram

```
                                ┌─────────────────────────────┐
                                │         Safaricom            │
                                │         M-Pesa               │
                                └──────────────▲──────────────┘
                                               │ STK push / payment
                                               │
                                ┌──────────────┴──────────────┐
                                │         Lipana API           │
                                │   (payment links, webhooks)  │
                                └───────▲──────────────┬──────┘
                                        │ REST          │ webhook (signed)
                                        │               │ payment.success
┌──────────────┐   HTTPS   ┌────────────┴───────────────▼─────────────────────┐
│   Browser /   │──────────▶                  Nginx (TLS, rate limit)          │
│  Mobile web   │           └──────┬──────────────────────────────┬───────────┘
└──────────────┘                   │ /                            │ /api, /webhooks
                                   ▼                              ▼
                        ┌──────────────────┐          ┌──────────────────────┐
                        │   Next.js 16     │   JWT    │   FastAPI backend    │
                        │  (SSR + React    │──────────▶  auth │ wallets      │
                        │   Query client)  │   REST   │  markets │ trading   │
                        └──────────────────┘          │  payments │ admin    │
                                                      └──┬─────────┬───────┬─┘
                                                         │         │       │
                                          async (SQLAlchemy)   cache/locks │ background
                                                         │         │       │ tasks
                                                         ▼         ▼       ▼
                                              ┌──────────────┐ ┌───────┐ ┌──────────┐
                                              │  PostgreSQL  │ │ Redis │ │  Resend  │
                                              │  (source of  │ │       │ │  (email) │
                                              │   truth)     │ └───────┘ └──────────┘
                                              └──────────────┘
```

## Component responsibilities

### Nginx
- TLS termination (Let's Encrypt), HTTP→HTTPS redirect
- Reverse proxy: `/` → Next.js, `/api/*` and `/webhooks/*` → FastAPI
- First-line rate limiting (`limit_req`) and request body size caps
- Serves static assets with long cache headers

### Next.js 16 (frontend)
- Server-side rendering of market list/detail pages (fast first paint on 3G —
  African mobile-first constraint)
- TanStack Query for client cache, optimistic UI on trades
- Middleware-based route protection (checks for refresh cookie, redirects to login)
- Talks to FastAPI only; holds no business logic

### FastAPI (backend) — single deployable, modular monolith
A modular monolith is the right call at MVP scale (100k users is comfortably
one Postgres + a few API replicas). Modules are isolated enough to extract
later if needed.

| Module | Responsibility |
|---|---|
| `auth` | register, login, email verification, password reset, JWT issuance |
| `users` | profile, accuracy stats |
| `wallets` | balance, ledger, deposit initiation |
| `markets` | market CRUD (admin), listing, detail, price history |
| `trading` | LMSR engine, buy/sell, positions |
| `payments` | Lipana client, webhook handler, idempotent crediting |
| `admin` | market resolution, payouts, audit |

### PostgreSQL — single source of truth
- All money movements are rows in `wallet_transactions` (double-entry style)
- Balances are derived-but-cached: `wallets.balance` updated in the same DB
  transaction as the ledger row, reconcilable by `SUM(amount)`
- Row-level locks (`FOR UPDATE`) serialize wallet and market-pool mutations

### Redis
- Rate limiting counters (sliding window per IP + per user)
- Cache: market list, leaderboard (60s TTL), current prices
- Short-lived locks (e.g. dedupe of webhook retries before hitting the DB)
- Refresh-token denylist (logout / password reset invalidation)

### Background tasks (FastAPI `BackgroundTasks` + a small worker loop)
MVP avoids Celery. Two mechanisms:
- **In-request background tasks**: send emails (Resend), write audit logs
- **Worker loop** (same codebase, separate container, `python -m app.worker`):
  - close markets whose `end_date` passed
  - reconcile pending deposits older than 10 min against Lipana's GET API
  - recompute leaderboard into Redis every 5 min

## Key data flows

### Deposit (money in)
```
User → POST /wallet/deposit {amount}
Backend → Lipana POST /v1/payment-links → returns checkout URL
Backend → creates wallet_transactions row (type=deposit, status=pending)
User → pays via M-Pesa STK on phone
Lipana → POST /webhooks/lipana (payment.success, signed)
Backend → verify signature → match pending tx → credit wallet (idempotent)
Frontend → polls GET /wallet/transactions/{id} → shows "Deposit complete"
```

### Trade (buy YES)
```
User → POST /trade/buy {market_id, side: YES, amount: 500}
Backend (one DB transaction):
  1. SELECT wallet FOR UPDATE  → check balance ≥ 500
  2. SELECT market_pool FOR UPDATE → market open?
  3. LMSR: shares = inverse_cost(amount)  → new prices
  4. Debit wallet (ledger row type=trade_buy)
  5. Upsert position (quantity, avg_price)
  6. Insert trade row + price_history point
COMMIT → respond with shares bought, new price
```

### Resolution (money out)
```
Admin → POST /admin/resolve-market {market_id, result: YES, evidence}
Backend (one DB transaction):
  1. Lock market, set status=resolved
  2. Insert market_resolutions + audit_logs rows
  3. For each winning position: credit quantity × 100 cents (1 KES/share)
     as ledger row type=payout; zero out positions
COMMIT → background task emails winners
```

## Scalability path to 100k users
- API is stateless → scale horizontally behind Nginx (2–4 replicas on one VPS,
  then multiple VPSes)
- Postgres: connection pooling (asyncpg + PgBouncer at ~50+ connections),
  read replica for market lists/leaderboard if needed
- Hot reads (market list, prices, leaderboard) served from Redis
- Trading writes are per-market serialized — that's the natural bottleneck and
  it's fine: even a hot market at 50 trades/sec is trivial for one Postgres row
