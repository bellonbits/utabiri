-- ============================================================
-- Utabiri MVP — PostgreSQL schema
-- Conventions:
--   * All money is integer cents (BIGINT). 100 cents = 1 KES.
--   * Shares are NUMERIC(20,6). One winning share pays 100 cents.
--   * Prices are NUMERIC(7,6) in [0,1] (probability).
--   * UUID PKs (gen_random_uuid, pgcrypto) — safe to expose in URLs.
--   * created_at TIMESTAMPTZ everywhere; app servers run UTC.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ------------------------------------------------------------
-- Users & auth
-- ------------------------------------------------------------
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           CITEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,                  -- argon2id
    display_name    VARCHAR(50) NOT NULL,
    phone_number    VARCHAR(15),                    -- E.164, for M-Pesa receipts
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
    is_suspended    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One-time tokens for email verification & password reset.
-- Store only the SHA-256 of the token; the raw token goes in the email link.
CREATE TABLE auth_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,
    purpose     VARCHAR(20) NOT NULL CHECK (purpose IN ('verify_email', 'reset_password')),
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_auth_tokens_user ON auth_tokens(user_id, purpose);

-- Refresh sessions (rotating refresh tokens; revoke on logout/reset)
CREATE TABLE refresh_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,
    user_agent  TEXT,
    ip          INET,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_sessions_user ON refresh_sessions(user_id);

-- ------------------------------------------------------------
-- Wallets & ledger
-- ------------------------------------------------------------
CREATE TABLE wallets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    balance     BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),  -- cents
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE wallet_tx_type AS ENUM (
    'deposit',      -- M-Pesa in (via Lipana)
    'trade_buy',    -- debit: bought shares
    'trade_sell',   -- credit: sold shares back to AMM
    'payout',       -- credit: winning resolution
    'refund',       -- credit: market voided
    'adjustment'    -- admin manual correction (audited)
);

CREATE TYPE wallet_tx_status AS ENUM ('pending', 'completed', 'failed', 'expired');

CREATE TABLE wallet_transactions (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                UUID NOT NULL REFERENCES users(id),
    type                   wallet_tx_type NOT NULL,
    -- signed cents: positive = credit, negative = debit
    amount                 BIGINT NOT NULL,
    status                 wallet_tx_status NOT NULL DEFAULT 'completed',
    balance_after          BIGINT,                  -- snapshot, set when completed
    -- payment linkage (deposits only)
    lipana_payment_link_id TEXT,
    lipana_transaction_id  TEXT,                    -- M-Pesa/Lipana receipt
    -- trade/payout linkage
    market_id              UUID,
    trade_id               UUID,
    metadata               JSONB NOT NULL DEFAULT '{}',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at           TIMESTAMPTZ
);

-- THE idempotency guarantee: a Lipana transaction can credit at most once.
CREATE UNIQUE INDEX uq_wallet_tx_lipana
    ON wallet_transactions(lipana_transaction_id)
    WHERE lipana_transaction_id IS NOT NULL;
CREATE UNIQUE INDEX uq_wallet_tx_payment_link
    ON wallet_transactions(lipana_payment_link_id)
    WHERE lipana_payment_link_id IS NOT NULL;
CREATE INDEX idx_wallet_tx_user_created ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX idx_wallet_tx_pending ON wallet_transactions(status, created_at)
    WHERE status = 'pending';

-- ------------------------------------------------------------
-- Markets
-- ------------------------------------------------------------
CREATE TYPE market_category AS ENUM
    ('politics', 'sports', 'economy', 'business', 'entertainment');

CREATE TYPE market_status AS ENUM
    ('open', 'closed', 'resolved', 'voided');
    -- open: trading allowed
    -- closed: end_date passed, awaiting resolution
    -- resolved: outcome decided, payouts done
    -- voided: cancelled, all stakes refunded

CREATE TABLE markets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug                VARCHAR(120) NOT NULL UNIQUE,
    question            VARCHAR(200) NOT NULL,
    description         TEXT NOT NULL DEFAULT '',
    resolution_criteria TEXT NOT NULL,              -- what counts as YES, sources
    category            market_category NOT NULL,
    status              market_status NOT NULL DEFAULT 'open',
    end_date            TIMESTAMPTZ NOT NULL,       -- trading stops here
    created_by          UUID NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_markets_status_end ON markets(status, end_date);
CREATE INDEX idx_markets_category ON markets(category) WHERE status = 'open';

-- LMSR liquidity pool — one row per market; the row that trades lock.
CREATE TABLE market_pools (
    market_id    UUID PRIMARY KEY REFERENCES markets(id) ON DELETE CASCADE,
    b            NUMERIC(20,6) NOT NULL,             -- liquidity parameter
    q_yes        NUMERIC(20,6) NOT NULL DEFAULT 0,   -- net YES shares sold
    q_no         NUMERIC(20,6) NOT NULL DEFAULT 0,   -- net NO shares sold
    price_yes    NUMERIC(7,6) NOT NULL DEFAULT 0.5,  -- cached for reads
    price_no     NUMERIC(7,6) NOT NULL DEFAULT 0.5,
    volume_cents BIGINT NOT NULL DEFAULT 0,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- For charts. Append-only, one point per trade (downsample in queries).
CREATE TABLE price_history (
    id         BIGSERIAL PRIMARY KEY,
    market_id  UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    price_yes  NUMERIC(7,6) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_price_history_market ON price_history(market_id, created_at);

-- ------------------------------------------------------------
-- Positions & trades
-- ------------------------------------------------------------
CREATE TYPE position_side AS ENUM ('YES', 'NO');

CREATE TABLE positions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    market_id   UUID NOT NULL REFERENCES markets(id),
    side        position_side NOT NULL,
    quantity    NUMERIC(20,6) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    avg_price   NUMERIC(7,6) NOT NULL DEFAULT 0,     -- avg cost per share (KES)
    cost_cents  BIGINT NOT NULL DEFAULT 0,           -- total cost basis remaining
    realized_pnl_cents BIGINT NOT NULL DEFAULT 0,
    settled     BOOLEAN NOT NULL DEFAULT FALSE,      -- paid out / zeroed at resolution
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, market_id, side)
);
CREATE INDEX idx_positions_user ON positions(user_id) WHERE NOT settled;
CREATE INDEX idx_positions_market ON positions(market_id) WHERE NOT settled;

CREATE TYPE trade_type AS ENUM ('buy', 'sell');

CREATE TABLE trades (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id),
    market_id    UUID NOT NULL REFERENCES markets(id),
    side         position_side NOT NULL,
    type         trade_type NOT NULL,
    quantity     NUMERIC(20,6) NOT NULL CHECK (quantity > 0),
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0), -- cash moved
    price        NUMERIC(7,6) NOT NULL,                    -- effective avg price
    price_after  NUMERIC(7,6) NOT NULL,                    -- market price post-trade
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_trades_user ON trades(user_id, created_at DESC);
CREATE INDEX idx_trades_market ON trades(market_id, created_at DESC);

-- ------------------------------------------------------------
-- Resolution & audit
-- ------------------------------------------------------------
CREATE TABLE market_resolutions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id   UUID NOT NULL UNIQUE REFERENCES markets(id),
    result      position_side NOT NULL,             -- YES or NO won
    admin_id    UUID NOT NULL REFERENCES users(id),
    evidence    TEXT NOT NULL,                      -- links/notes justifying outcome
    payout_total_cents BIGINT NOT NULL DEFAULT 0,
    winners_count      INT NOT NULL DEFAULT 0,
    resolved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
    id         BIGSERIAL PRIMARY KEY,
    action     VARCHAR(60) NOT NULL,    -- e.g. market.resolve, wallet.adjust, auth.login_failed
    user_id    UUID REFERENCES users(id),
    ip         INET,
    metadata   JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);

-- Raw webhook archive — store everything Lipana sends, before processing.
-- Lets you replay/debug without depending on Lipana's retention.
CREATE TABLE webhook_events (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider     VARCHAR(20) NOT NULL DEFAULT 'lipana',
    event_type   VARCHAR(60) NOT NULL,
    external_id  TEXT,                    -- Lipana event id (idempotency at HTTP layer)
    payload      JSONB NOT NULL,
    signature_ok BOOLEAN NOT NULL,
    processed_at TIMESTAMPTZ,
    error        TEXT,
    received_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_webhook_external
    ON webhook_events(provider, external_id) WHERE external_id IS NOT NULL;

-- ------------------------------------------------------------
-- Leaderboard (materialized; refreshed by worker every 5 min)
-- ------------------------------------------------------------
CREATE MATERIALIZED VIEW leaderboard AS
SELECT
    u.id AS user_id,
    u.display_name,
    COALESCE(SUM(p.realized_pnl_cents), 0)                        AS profit_cents,
    COUNT(*) FILTER (WHERE p.settled AND p.realized_pnl_cents > 0) AS wins,
    COUNT(*) FILTER (WHERE p.settled)                              AS settled_positions,
    CASE WHEN COUNT(*) FILTER (WHERE p.settled) > 0
         THEN ROUND(COUNT(*) FILTER (WHERE p.settled AND p.realized_pnl_cents > 0)::numeric
              / COUNT(*) FILTER (WHERE p.settled), 4)
         ELSE 0 END                                                AS win_rate,
    (SELECT COUNT(*) FROM trades t WHERE t.user_id = u.id)         AS total_trades
FROM users u
LEFT JOIN positions p ON p.user_id = u.id
WHERE u.is_suspended = FALSE
GROUP BY u.id, u.display_name;

CREATE UNIQUE INDEX uq_leaderboard_user ON leaderboard(user_id);
-- Refresh with: REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard;
