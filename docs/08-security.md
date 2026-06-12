# 8. Security Model

## Authentication

| Concern | Decision |
|---|---|
| Password hashing | **argon2id** (argon2-cffi), m=64MB, t=3, p=4 |
| Password policy | ≥ 8 chars, checked against a common-password list; no arbitrary composition rules |
| Access token | JWT (HS256, strong 256-bit secret), **15 min TTL**, claims: `sub`, `is_admin`, `exp`, `iat`, `jti` |
| Refresh token | Opaque random 256-bit value, **30 day TTL**, stored as SHA-256 hash in `refresh_sessions`, **rotated on every use**; reuse of a rotated token revokes the whole session family (theft detection) |
| Email verification | Required before login. One-time token: 256-bit random, SHA-256 stored, 24h TTL, single use |
| Password reset | Same token mechanism, 1h TTL; on success **all refresh sessions revoked** + notification email |
| Account enumeration | register/forgot/resend endpoints return identical responses & timings whether or not the email exists |
| Frontend storage | Tokens in **httpOnly Secure SameSite=Lax cookies** via Next.js route handlers — never localStorage |

## Authorization

- Every protected route depends on `get_current_user` (validates JWT, loads
  user, rejects suspended accounts — DB lookup means bans take effect within
  one request, not at token expiry).
- Admin endpoints use `require_admin`; `is_admin` is read from the DB row, not
  trusted from the JWT claim alone.
- Object-level checks in repositories: wallet/position/transaction queries are
  always scoped `WHERE user_id = :current_user` — no IDOR by construction.

## Webhook security (see payments doc for code)

- HMAC-SHA256 of the **raw body** with `LIPANA_WEBHOOK_SECRET`,
  `hmac.compare_digest` (constant-time).
- Optional IP allowlist for Lipana's egress IPs at Nginx, defense in depth.
- Replay protection: event-id unique index + per-transaction idempotency.
- Webhook route excluded from JWT auth but rate-limited at Nginx.

## Rate limiting (Redis sliding window)

| Scope | Limit |
|---|---|
| `POST /auth/login` | 10 / 15 min / IP, +5 / 15 min / email (lockout with backoff) |
| `POST /auth/register`, forgot/resend | 3–5 / hour / IP |
| `POST /trade/*` | 10 / min / user |
| `POST /wallet/deposit` | 10 / hour / user |
| Global API | 120 / min / IP at Nginx (`limit_req`), burst 40 |

429 responses include `Retry-After`.

## Input validation & injection

- Pydantic v2 schemas on every request body/query: types, ranges
  (`amount_cents: int = Field(ge=1000, le=15_000_000)`), enum side/category,
  `extra="forbid"`.
- SQLAlchemy parameterized queries only — **zero string-built SQL** (lint for
  `text(` usage in CI).
- Money is integer cents end-to-end; reject floats in payloads.
- HTML output: React escapes by default; market descriptions rendered as plain
  text (no rich text in MVP).

## Financial integrity controls

- `CHECK (balance >= 0)` — the DB refuses overdrafts even under app bugs.
- Double-entry style ledger: nightly worker job asserts
  `wallets.balance == SUM(wallet_transactions.amount WHERE completed)` per
  user; any drift pages the operator.
- All money mutations inside single DB transactions with row locks
  (`FOR UPDATE` on wallet + pool), ordered consistently (wallet → pool) to
  avoid deadlocks.
- Admin `adjustment` transactions require a reason and are audit-logged.

## Audit logging

`audit_logs` rows (append-only, no UPDATE/DELETE grants for the app role) for:
- `auth.login`, `auth.login_failed`, `auth.password_reset`
- `wallet.deposit_credited`, `wallet.adjustment`
- `trade.buy`, `trade.sell` (ids + amounts in metadata)
- `market.create`, `market.resolve`, `market.void` (admin id + evidence)
- `admin.*` — every admin endpoint logs unconditionally

## Transport & platform hardening

- TLS 1.2+ only, HSTS, HTTP→HTTPS redirect at Nginx.
- Security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  CSP (`default-src 'self'`), `Referrer-Policy: strict-origin-when-cross-origin`.
- CORS: exact frontend origin only, credentials allowed, no wildcards.
- Secrets via environment (.env on VPS, `chmod 600`, never in git); separate
  Lipana test/live keys per environment.
- Postgres & Redis bound to the Docker network only — no public ports.
- Containers run as non-root; `restart: unless-stopped`; daily encrypted
  `pg_dump` shipped off-box.
- Dependency scanning (`pip-audit`, `npm audit`) in CI.

## Kenya-specific compliance flags (pre-launch checklist)

- BCLB licence for real-money prediction/gaming.
- KRA: 20% withholding tax on winnings, excise duty on stakes — model into
  payout math before charging real money.
- Data Protection Act 2019 (ODPC registration) — you store phone numbers and
  financial history.
- Responsible gambling: self-exclusion, deposit limits, 18+ verification.
