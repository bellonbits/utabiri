# 5. API Specification

Base URL: `https://api.utabiri.co.ke/api/v1` (webhooks live outside `/api/v1`).

Conventions:
- Auth: `Authorization: Bearer <access_token>` unless marked Public.
- Money: integer **cents** in all payloads (`amount_cents`). 100 = KES 1.
- Prices: decimals in `[0,1]`.
- Errors: `{"error": {"code": "INSUFFICIENT_BALANCE", "message": "..."}}` with
  appropriate HTTP status. Validation errors: 422 with field details.
- Lists: cursor pagination — `?cursor=<opaque>&limit=20` →
  `{"items": [...], "next_cursor": "..." | null}`.

---

## Auth (Public)

### POST /auth/register
```json
{ "email": "amina@example.com", "password": "min 8 chars",
  "display_name": "Amina", "phone_number": "+254712345678" }
```
`201` → `{"message": "Verification email sent"}`
Errors: `409 EMAIL_TAKEN`, `422` weak password.
Side effects: creates user (unverified) + wallet, emails verification link.
Rate limit: 5/hour/IP.

### POST /auth/verify-email
`{ "token": "<from email link>" }` → `200 {"message": "Email verified"}`
Errors: `400 TOKEN_INVALID`, `400 TOKEN_EXPIRED` (24h TTL).

### POST /auth/resend-verification
`{ "email": "..." }` → always `200` (no account enumeration). 3/hour/IP.

### POST /auth/login
`{ "email": "...", "password": "..." }` →
```json
{ "access_token": "eyJ...", "refresh_token": "eyJ...",
  "expires_in": 900,
  "user": { "id": "...", "email": "...", "display_name": "...", "is_admin": false } }
```
Errors: `401 INVALID_CREDENTIALS`, `403 EMAIL_NOT_VERIFIED`. 10/15min/IP.

### POST /auth/refresh
`{ "refresh_token": "..." }` → new token pair (rotation: old refresh revoked).
`401 SESSION_REVOKED` if reused/expired.

### POST /auth/logout  (authed)
Revokes the refresh session. `204`.

### POST /auth/forgot-password
`{ "email": "..." }` → always `200`. Emails reset link (1h TTL). 3/hour/IP.

### POST /auth/reset-password
`{ "token": "...", "new_password": "..." }` → `200`. Revokes all sessions.

---

## Users

### GET /users/me
```json
{ "id": "...", "email": "...", "display_name": "...", "phone_number": "...",
  "is_admin": false, "created_at": "..." }
```

### GET /users/me/stats
```json
{ "profit_cents": 12500, "win_rate": 0.61, "accuracy": 0.61,
  "settled_positions": 18, "open_positions": 4, "total_trades": 57 }
```

---

## Wallet

### GET /wallet
`{ "balance_cents": 150000, "currency": "KES" }`

### POST /wallet/deposit
`{ "amount_cents": 50000 }`  (min 5000 = KES 50, max 15000000 = KES 150,000/day)
```json
{ "transaction_id": "uuid", "checkout_url": "https://pay.lipana.dev/...",
  "status": "pending", "expires_at": "..." }
```
Creates pending ledger row + Lipana payment link. Frontend redirects user to
`checkout_url`. Rate limit: 10/hour/user.

### GET /wallet/transactions?type=&cursor=&limit=
```json
{ "items": [ { "id": "...", "type": "deposit", "amount_cents": 50000,
    "status": "completed", "market_id": null, "created_at": "...",
    "completed_at": "..." } ], "next_cursor": null }
```

### GET /wallet/transactions/{id}
Single transaction — polled by the deposit status page.

---

## Markets (Public read)

### GET /markets?category=&status=open&sort=volume|ending_soon|newest&cursor=&limit=
```json
{ "items": [ {
    "id": "...", "slug": "kenya-afcon-2027",
    "question": "Will Kenya qualify for AFCON 2027?",
    "category": "sports", "status": "open",
    "price_yes": 0.62, "price_no": 0.38,
    "volume_cents": 184000000, "end_date": "2026-11-30T20:59:59Z"
} ], "next_cursor": "..." }
```

### GET /markets/{slug}
Full detail: + `description`, `resolution_criteria`, `created_at`,
`resolution` (`{result, evidence, resolved_at}` when resolved).

### GET /markets/{id}/price-history?range=1d|1w|1m|all
`{ "points": [ { "t": "...", "price_yes": 0.61 } ] }` (downsampled ≤ 300 points)

### GET /markets/{id}/trades?limit=20   — recent public trade tape (anonymized)

---

## Trading

### POST /trade/quote
Preview without executing (also used by the trade panel):
```json
{ "market_id": "...", "side": "YES", "type": "buy", "amount_cents": 50000 }
```
```json
{ "shares": 76.4521, "avg_price": 0.6540, "price_after": 0.6712,
  "potential_payout_cents": 764521, "fee_cents": 0 }
```

### POST /trade/buy
Request: same shape as quote (+ optional `max_avg_price` slippage guard).
```json
{ "trade_id": "...", "shares": 76.4521, "avg_price": 0.6540,
  "price_after": 0.6712, "new_balance_cents": 100000,
  "position": { "side": "YES", "quantity": 120.0, "avg_price": 0.6231 } }
```
Errors: `400 INSUFFICIENT_BALANCE`, `400 MARKET_CLOSED`,
`400 SLIPPAGE_EXCEEDED`, `400 AMOUNT_TOO_SMALL` (min KES 10).
Rate limit: 10/min/user.

### POST /trade/sell
`{ "market_id": "...", "side": "YES", "quantity": 50.0, "min_avg_price": 0.60 }`
→ same response shape; credits wallet with sale proceeds, updates
`realized_pnl_cents`. Errors: `400 INSUFFICIENT_SHARES`, `400 MARKET_CLOSED`.

### GET /positions?status=open|settled&cursor=
```json
{ "items": [ {
    "market": { "id": "...", "slug": "...", "question": "...",
                "status": "open", "price_yes": 0.62 },
    "side": "YES", "quantity": 120.0, "avg_price": 0.6231,
    "cost_cents": 74772, "current_value_cents": 74400,
    "unrealized_pnl_cents": -372, "realized_pnl_cents": 0
} ], "next_cursor": null }
```

---

## Leaderboard (Public)

### GET /leaderboard?by=profit|win_rate|activity&limit=100
```json
{ "items": [ { "rank": 1, "display_name": "Amina",
    "profit_cents": 845000, "win_rate": 0.71, "total_trades": 212 } ],
  "me": { "rank": 1432, "profit_cents": 12500, ... } }
```

---

## Admin (requires `is_admin`)

### POST /admin/markets
`{ "question", "description", "resolution_criteria", "category",
   "end_date", "initial_liquidity_b": 1000 }` → `201` market (status `open`,
pool seeded at 0.5/0.5).

### GET /admin/markets?status=closed   — resolution queue

### POST /admin/resolve-market
```json
{ "market_id": "...", "result": "YES",
  "evidence": "CAF official results: https://..." }
```
```json
{ "market_id": "...", "result": "YES", "winners_count": 412,
  "payout_total_cents": 51200000 }
```
Errors: `400 MARKET_NOT_CLOSED` (must pass end_date first),
`409 ALREADY_RESOLVED`. Writes `market_resolutions` + `audit_logs`; payouts in
the same transaction; winner emails queued.

### POST /admin/void-market
`{ "market_id", "reason" }` — refunds every position's `cost_cents`, audited.

### GET /admin/audit-logs?action=&user_id=&cursor=

---

## Webhooks (Public endpoint, signature-authenticated)

### POST /webhooks/lipana
Headers: `X-Lipana-Signature: <hex hmac-sha256 of raw body>`
```json
{ "id": "evt_...", "event": "payment.success",
  "data": { "payment_link_id": "plink_...", "transaction_id": "SFC8X1QTRZ",
            "amount": 500, "currency": "KES", "phone": "+254712...",
            "paid_at": "..." } }
```
Responses: `200` processed or already-processed (idempotent), `400` bad
signature, `200` unknown event type (archived, ignored).
**Never** returns 5xx for business-rule issues — archive + alert instead, so
Lipana doesn't retry-storm.
