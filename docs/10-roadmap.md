# 10. MVP Roadmap — Step-by-Step Build Plan

Ordered so that every phase ends with something testable, and the riskiest
integrations (Lipana, money math) are de-risked early. Rough effort assumes
one full-stack developer; phases 1–8 ≈ 6–8 weeks.

## Phase 0 — Foundations (1–2 days)
- [ ] Monorepo: `backend/`, `frontend/`, `docker-compose.yml`, `.env.example`
- [ ] FastAPI skeleton with `/health`; Next.js skeleton; both in Docker
- [ ] Postgres + Redis services; Alembic wired; CI: lint + tests on push
- **Exit test**: `docker compose up` serves both apps locally.

## Phase 1 — Auth (3–4 days)
- [ ] Schema: `users`, `auth_tokens`, `refresh_sessions` (first migration)
- [ ] Register → Resend verification email → verify → login (JWT pair)
- [ ] Refresh rotation, logout, forgot/reset password
- [ ] Next.js auth pages + cookie-bridge route handlers + middleware
- [ ] Rate limits on all auth endpoints; audit log on login/reset
- **Exit test**: full register→verify→login→refresh→logout cycle in browser;
  unverified users cannot log in.

## Phase 2 — Wallet + Lipana deposits (4–5 days)  ⚠ riskiest external dep — do early
- [ ] Schema: `wallets`, `wallet_transactions`, `webhook_events`
- [ ] Lipana client; `POST /wallet/deposit` → payment link
- [ ] Webhook endpoint: signature verify, archive, idempotent credit
- [ ] Reconciliation worker job for stuck pendings
- [ ] Wallet UI: balance, deposit dialog, status polling page, tx history
- **Exit test**: real KES 10 deposit on Lipana sandbox/test mode lands in the
  wallet exactly once, even when the webhook is replayed manually 5×.

## Phase 3 — Markets (2–3 days)
- [ ] Schema: `markets`, `market_pools`, `price_history`
- [ ] Admin create market (seeds pool at b, 0.5/0.5); list/detail endpoints
- [ ] Market list + detail pages (SSR), category tabs, countdown
- [ ] Worker: auto-close markets past `end_date`
- **Exit test**: admin creates "Will Kenya qualify for AFCON 2027?"; it renders
  at 50/50 and closes itself when end_date passes.

## Phase 4 — Trading engine (4–5 days)  ⚠ money-critical — test heavily
- [ ] `engine.py` (pure LMSR) + the 5 property tests from the engine doc
- [ ] Schema: `positions`, `trades`
- [ ] `POST /trade/quote`, `/trade/buy`, `/trade/sell` with wallet+pool locking
- [ ] Concurrency test: 50 parallel buys on one market — balances, pool state,
      and ledger must reconcile exactly
- [ ] Trade panel UI with quote preview + slippage guard; price chart
- **Exit test**: two users trade against each other via the AMM; sum of all
  wallets + house exposure matches deposits to the cent.

## Phase 5 — Resolution & payouts (2–3 days)
- [ ] Schema: `market_resolutions`, `audit_logs`
- [ ] `POST /admin/resolve-market` (atomic payouts) + void/refund path
- [ ] Admin resolution queue UI with evidence field
- [ ] Winner notification emails (background)
- **Exit test**: resolve a market with 3 winners/2 losers; every wallet, the
  ledger, and `realized_pnl` reconcile; action visible in audit log.

## Phase 6 — Portfolio & leaderboard (2–3 days)
- [ ] `GET /positions` with live unrealized P&L; portfolio page
- [ ] User stats (accuracy, win rate); leaderboard matview + worker refresh +
      page
- **Exit test**: P&L on portfolio page matches hand-computed values after a
  scripted trade sequence.

## Phase 7 — Hardening (3–4 days)
- [ ] Full rate-limit matrix; security headers; CORS lockdown
- [ ] Nightly ledger reconciliation job + alerting; Sentry; structured logs
- [ ] Load test: 200 concurrent users browsing, 20 trading (k6/locust)
- [ ] Pen-test pass over auth + webhook + IDOR checklist
- **Exit test**: load test holds p95 < 500ms on market pages; reconciliation
  job reports zero drift after the load test's random trades.

## Phase 8 — Launch prep (2–3 days)
- [ ] VPS provisioning, TLS, backups + tested restore, deploy script
- [ ] Lipana live keys; small real-money end-to-end test
- [ ] Seed 10–15 quality markets across categories
- [ ] Terms of service, responsible-gambling page, 18+ gate
- **Exit test**: production deposit → trade → resolve → payout with real money,
  audited end to end.

## Explicitly deferred (post-MVP, in order)
1. **Withdrawals** (Lipana B2C + manual approval + KYC thresholds)
2. Multi-outcome markets (LMSR generalizes to n outcomes naturally)
3. Push/SMS notifications (resolution alerts)
4. Referral program; market comments
5. Order book / limit orders (only if volume justifies it)

## Standing risks to track
- **Regulatory (BCLB/KRA)** — start the licensing conversation in parallel
  with Phase 0; it is the longest pole, not the code.
- **Lipana reliability** — the reconciliation worker is the safety net; keep
  an eye on `webhook_events.error` from day one.
- **Resolution disputes** — strict, source-named resolution criteria at market
  creation time is the cheapest insurance you can buy.
