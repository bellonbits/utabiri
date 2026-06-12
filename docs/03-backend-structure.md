# 3. FastAPI Backend Structure

Python 3.11+, FastAPI, SQLAlchemy 2.0 (async, asyncpg), Alembic, Redis, Pydantic v2.

```
backend/
├── pyproject.toml
├── alembic/
│   ├── env.py
│   └── versions/
├── app/
│   ├── main.py                      # app factory, router mounting, lifespan
│   ├── worker.py                    # background worker loop (separate container)
│   │
│   ├── config/
│   │   └── settings.py              # Pydantic Settings, reads env vars
│   │
│   ├── core/
│   │   ├── database.py              # async engine, session factory, get_db dep
│   │   ├── redis.py                 # redis pool, get_redis dep
│   │   ├── exceptions.py            # AppError hierarchy → JSON error handler
│   │   ├── pagination.py            # cursor pagination helpers
│   │   └── money.py                 # Cents type, KES formatting, conversions
│   │
│   ├── security/
│   │   ├── passwords.py             # argon2id hash/verify
│   │   ├── jwt.py                   # access token create/decode
│   │   ├── tokens.py                # one-time tokens (verify email, reset)
│   │   ├── deps.py                  # get_current_user, require_admin
│   │   └── rate_limit.py            # Redis sliding-window limiter dep
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── router.py            # /auth/*
│   │   │   ├── service.py           # register, login, verify, reset flows
│   │   │   ├── repository.py        # users + auth_tokens + refresh_sessions
│   │   │   └── schemas.py           # Pydantic request/response models
│   │   │
│   │   ├── users/
│   │   │   ├── router.py            # /users/me, /users/{id}/stats
│   │   │   ├── service.py
│   │   │   └── repository.py
│   │   │
│   │   ├── wallets/
│   │   │   ├── router.py            # /wallet/*
│   │   │   ├── service.py           # deposit initiation, ledger queries
│   │   │   ├── repository.py        # wallet locking, ledger writes
│   │   │   └── schemas.py
│   │   │
│   │   ├── markets/
│   │   │   ├── router.py            # /markets/*
│   │   │   ├── service.py
│   │   │   ├── repository.py
│   │   │   └── schemas.py
│   │   │
│   │   ├── trading/
│   │   │   ├── router.py            # /trade/*, /positions
│   │   │   ├── service.py           # orchestrates wallet + pool + position
│   │   │   ├── engine.py            # pure LMSR math (no I/O — unit-testable)
│   │   │   ├── repository.py        # pool FOR UPDATE, position upsert
│   │   │   └── schemas.py
│   │   │
│   │   ├── payments/
│   │   │   ├── lipana.py            # Lipana HTTP client (httpx)
│   │   │   ├── webhooks.py          # /webhooks/lipana router + handler registry
│   │   │   ├── service.py           # credit_deposit (idempotent), reconcile
│   │   │   └── schemas.py           # webhook payload models
│   │   │
│   │   ├── leaderboard/
│   │   │   ├── router.py            # /leaderboard
│   │   │   └── service.py           # reads Redis cache / matview
│   │   │
│   │   └── admin/
│   │       ├── router.py            # /admin/*
│   │       ├── service.py           # resolve_market, void_market, payouts
│   │       └── schemas.py
│   │
│   ├── models/                      # SQLAlchemy ORM models (one file per area)
│   │   ├── base.py
│   │   ├── user.py
│   │   ├── wallet.py
│   │   ├── market.py
│   │   ├── trading.py
│   │   └── audit.py
│   │
│   └── utils/
│       ├── email.py                 # Resend client + templates
│       ├── audit.py                 # write_audit(action, user, meta)
│       └── slugify.py
│
└── tests/
    ├── unit/                        # engine math, money, security
    └── integration/                 # API tests against ephemeral Postgres
```

## Layering rules

```
router → service → repository → DB
              ↘ other services (same module boundary or via interface)
```

- **Routers**: HTTP only. Parse/validate via Pydantic schemas, call one service
  method, map `AppError` → HTTP status. No business logic, no SQL.
- **Services**: business logic and transaction boundaries. A service method
  that mutates money opens ONE DB transaction and does everything inside it.
- **Repositories**: all SQLAlchemy queries. Return ORM models or simple DTOs.
  This is where `FOR UPDATE` lives.
- **`trading/engine.py` is pure**: functions take numbers, return numbers.
  Zero imports from SQLAlchemy. This makes the money-critical math trivially
  unit-testable.

## Dependency injection

FastAPI `Depends` end to end:

```python
# core/database.py
async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionFactory() as session:
        yield session

# security/deps.py
async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_access_token(creds.credentials)   # raises 401
    user = await db.get(User, payload.sub)
    if user is None or user.is_suspended:
        raise UnauthorizedError()
    return user

async def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise ForbiddenError()
    return user

# modules/trading/router.py
@router.post("/buy", response_model=TradeResult)
async def buy(
    body: BuyRequest,
    user: User = Depends(get_current_user),
    svc: TradingService = Depends(get_trading_service),
    _: None = Depends(rate_limit("trade", limit=10, window=60)),
):
    return await svc.buy(user.id, body.market_id, body.side, body.amount_cents)
```

Services are constructed per-request from the session (cheap, no global state):

```python
def get_trading_service(db: AsyncSession = Depends(get_db)) -> TradingService:
    return TradingService(
        pools=PoolRepository(db),
        wallets=WalletRepository(db),
        positions=PositionRepository(db),
        db=db,
    )
```

## Transaction boundary pattern (money-critical)

```python
class TradingService:
    async def buy(self, user_id, market_id, side, amount_cents) -> TradeResult:
        async with self.db.begin():                       # one atomic tx
            wallet = await self.wallets.lock(user_id)      # FOR UPDATE
            if wallet.balance < amount_cents:
                raise InsufficientBalanceError()
            pool = await self.pools.lock(market_id)        # FOR UPDATE
            market = await self.pools.get_market(market_id)
            if market.status != "open" or market.end_date <= utcnow():
                raise MarketClosedError()

            quote = engine.buy_quote(pool, side, amount_cents)  # pure math
            await self.wallets.apply(wallet, -amount_cents,
                                     type="trade_buy", market_id=market_id)
            await self.pools.update(pool, quote)
            await self.positions.add(user_id, market_id, side,
                                     quote.shares, amount_cents)
            trade = await self.pools.record_trade(user_id, market_id, side,
                                                  "buy", quote)
        return TradeResult.from_quote(trade, quote)
```

## Webhook handler registry

```python
# modules/payments/webhooks.py
HANDLERS: dict[str, Callable[..., Awaitable[None]]] = {}

def on(event_type: str):
    def deco(fn): HANDLERS[event_type] = fn; return fn
    return deco

@on("payment.success")
async def handle_payment_success(payload: dict, db: AsyncSession): ...

@on("payment.failed")
async def handle_payment_failed(payload: dict, db: AsyncSession): ...
```

The router verifies the signature, archives the raw event into
`webhook_events`, then dispatches to the registered handler. Unknown event
types are archived and ACKed with 200 (never 500 on unknown types — Lipana
would retry forever).

## Background work

- **Per-request** (`BackgroundTasks`): verification/reset/payout emails via
  Resend; non-blocking audit enrichment.
- **Worker loop** (`app/worker.py`, separate container, ~30s tick):
  - `close_expired_markets()` — `status='open' AND end_date < now()` → `closed`
  - `reconcile_pending_deposits()` — pending deposits >10 min old: query
    Lipana GET endpoint; credit (idempotent) or mark `expired`
  - `refresh_leaderboard()` — every 5 min: `REFRESH MATERIALIZED VIEW
    CONCURRENTLY leaderboard`, push top 100 to Redis

## main.py

```python
def create_app() -> FastAPI:
    app = FastAPI(title="Utabiri API", lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origins=[settings.FRONTEND_URL], ...)
    app.add_exception_handler(AppError, app_error_handler)
    for r in (auth.router, users.router, wallets.router, markets.router,
              trading.router, leaderboard.router, admin.router,
              webhooks.router):
        app.include_router(r, prefix="/api/v1" if r is not webhooks.router else "")
    return app
```

(Webhooks mount at `/webhooks/lipana` — outside `/api/v1` and outside JWT auth.)
