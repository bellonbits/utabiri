# Utabiri — Prediction Marketplace MVP

Utabiri is a YES/NO prediction marketplace optimized for Kenya. Users deposit via
Lipa na M-Pesa (through the Lipana API), trade YES/NO shares on future events,
and get paid out when markets resolve in their favor.

## Design documents

| Doc | Contents |
|---|---|
| [docs/01-architecture.md](docs/01-architecture.md) | System architecture diagram, component responsibilities, data flows |
| [docs/02-database-schema.sql](docs/02-database-schema.sql) | Complete PostgreSQL schema (runnable SQL) |
| [docs/03-backend-structure.md](docs/03-backend-structure.md) | FastAPI project layout, service/repository layers, DI, background tasks |
| [docs/04-frontend-structure.md](docs/04-frontend-structure.md) | Next.js 16 app structure, auth middleware, React Query setup |
| [docs/05-api-spec.md](docs/05-api-spec.md) | Full REST API specification with request/response shapes |
| [docs/06-trading-engine.md](docs/06-trading-engine.md) | LMSR pricing model with reference Python implementation |
| [docs/07-payments-lipana.md](docs/07-payments-lipana.md) | Deposit flow, Lipana integration, webhook handling, idempotency |
| [docs/08-security.md](docs/08-security.md) | Auth model, webhook verification, rate limiting, audit logging |
| [docs/09-deployment.md](docs/09-deployment.md) | Docker Compose, Nginx, VPS deployment |
| [docs/10-roadmap.md](docs/10-roadmap.md) | Step-by-step MVP build plan |

## Core design decisions (TL;DR)

1. **LMSR automated market maker** — no order book. Prices always sum to 1.0,
   platform loss per market is bounded at `b·ln(2)`, no arbitrage between YES/NO.
2. **All money stored as integer cents (BIGINT)** — never floats. Shares stored
   as `NUMERIC(20,6)`.
3. **Double-entry ledger** — wallet balance is always reconcilable against
   `wallet_transactions`; webhook idempotency enforced by a unique constraint on
   `lipana_transaction_id`.
4. **Trades serialize per market** — `SELECT ... FOR UPDATE` on the market's
   liquidity pool row prevents race conditions on price.
5. **Webhook is the single source of truth for deposits** — frontend redirects
   are display-only.

## Running locally

```bash
# Backend (FastAPI + SQLite, port 8000) — seeds 12 markets + users on first run
cd backend && .venv/bin/uvicorn app.main:app --port 8000

# Frontend (Next.js, port 3100; uses NEXT_PUBLIC_API_URL from .env.local)
cd frontend && npm run build && npx next start -p 3100
```

On first boot the API creates a single admin account from `ADMIN_EMAIL` /
`ADMIN_PASSWORD` in `backend/.env` (market creation, resolution, withdrawal
approvals via `/admin/*`). No other data is seeded — markets are created
through the admin UI, and traders register themselves.

Dev-mode behaviour (no `LIPANA_SECRET_KEY` / `RESEND_API_KEY` set): deposits
credit instantly, and registration returns the email verification code in the
response instead of sending it. Set the env vars to enable the real Lipana
STK push + webhook and Resend email paths.

## Deploying with Docker (VPS)

```bash
git clone <repo> && cd utabiri
cp backend/.env.example backend/.env   # fill in secrets
NEXT_PUBLIC_API_URL=https://api.utabiri.co.ke docker compose up -d --build
```

- `api` (FastAPI) listens on :8000, `web` (Next.js standalone) on :3000 —
  put Nginx/Caddy in front for TLS (see [docs/09-deployment.md](docs/09-deployment.md)).
- SQLite lives in the `api-data` volume; swap `DATABASE_URL` in
  `backend/.env` to Postgres when ready.
- `NEXT_PUBLIC_API_URL` is the URL the **browser** uses to reach the API.
  It is baked into the web image at build time — rerun
  `docker compose up -d --build web` after changing it.

To redeploy after a code change: `git pull && docker compose up -d --build`.

## Regulatory note

Real-money prediction markets in Kenya fall under the Betting Control and
Licensing Board (BCLB). A bookmaker/public-gaming licence, KRA excise/withholding
tax handling (20% withholding on winnings), and responsible-gambling notices are
prerequisites for launch. Budget for this before going live.
