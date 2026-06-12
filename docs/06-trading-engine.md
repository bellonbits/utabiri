# 6. Trading Engine — LMSR Automated Market Maker

## Why LMSR (and not a linear model or order book)

The Logarithmic Market Scoring Rule is the standard AMM for prediction markets:

- **Prices always sum to exactly 1.0** — no YES/NO arbitrage by construction.
- **Platform loss is bounded** at `b·ln(2)` per market, no matter what traders
  do. With `b = 1000`, worst case the house pays out ≈ KES 693 more than it
  took in. That's the explicit, capped cost of providing liquidity.
- **Always liquid** — users can buy or sell any amount at any time; price
  impact grows smoothly with trade size.
- Closed-form math: no iterative solvers, easy to unit test.

A naive linear model ("YES +1% per X bought") drifts away from a coherent
probability space and is trivially exploitable; an order book needs matching
counterparties you won't have at MVP scale.

## The math

State per market: `q_yes`, `q_no` (net shares sold by the AMM) and liquidity
parameter `b` (bigger b = deeper market, slower price moves).

```
Cost function:   C(q_yes, q_no) = b · ln( e^(q_yes/b) + e^(q_no/b) )

Price (probability):
                 p_yes = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
                 p_no  = 1 − p_yes

Buy Δ shares of YES:        cost = C(q_yes + Δ, q_no) − C(q_yes, q_no)
Sell Δ shares of YES:    proceeds = C(q_yes, q_no) − C(q_yes − Δ, q_no)

Spend a fixed amount m on YES (inverse — what the API uses):
                 Δ = b · ln( e^(m/b) · (e^(q_yes/b) + e^(q_no/b)) − e^(q_no/b) ) − q_yes
```

Each share pays **100 cents (KES 1) if it wins, 0 if it loses**. So a share's
price *is* the market probability, and "potential payout" is just
`quantity × 1 KES`.

### Worked example (`b = 1000`, fresh market)

- Prices start at 0.50 / 0.50.
- Alice spends KES 500 on YES → she gets `1000·ln(e^0.5·2 − 1) ≈ 831.78`
  shares at avg price 0.6011. New `p_yes ≈ 0.6967`.
- If the market resolves YES, Alice receives KES 831.78 (profit ≈ KES 331.78).
- If Bob then spends KES 500 on NO, `p_yes` drops back toward ~0.50 — demand
  moves prices in both directions automatically.

### Choosing `b`

`b` ≈ "KES it takes to move the price meaningfully". Rule of thumb:
`b = expected total volume / 20`. MVP defaults: 500 (niche), 1000 (default),
5000 (flagship markets). Set per market at creation; **never change b on a
live market** (it breaks the no-arbitrage property).

## Reference implementation (`app/modules/trading/engine.py`)

Pure functions, no I/O. Floats are fine for the math (b ≤ 10⁵, well within
float64 precision); all rounding happens once, at the boundary, **always in
the house's favor**.

```python
"""LMSR market maker. Pure math — no DB, no I/O.

Units: cash in integer cents; shares and q as floats (stored NUMERIC(20,6)).
A winning share pays PAYOUT_CENTS.
"""
from __future__ import annotations
import math
from dataclasses import dataclass

PAYOUT_CENTS = 100          # 1 share pays KES 1.00 on a win
SHARE_DECIMALS = 6
MIN_TRADE_CENTS = 1_000     # KES 10 — keeps rounding dust irrelevant

@dataclass(frozen=True)
class Pool:
    b: float
    q_yes: float
    q_no: float

@dataclass(frozen=True)
class Quote:
    shares: float           # shares bought/sold (rounded, 6dp)
    amount_cents: int       # cash in (buy) or out (sell)
    avg_price: float        # (amount/100) / shares
    price_yes_after: float
    q_yes_after: float
    q_no_after: float


def _logsumexp(a: float, c: float) -> float:
    m = max(a, c)
    return m + math.log(math.exp(a - m) + math.exp(c - m))

def cost(pool: Pool) -> float:
    """C(q) in KES (float)."""
    return pool.b * _logsumexp(pool.q_yes / pool.b, pool.q_no / pool.b)

def price_yes(pool: Pool) -> float:
    zy, zn = pool.q_yes / pool.b, pool.q_no / pool.b
    m = max(zy, zn)
    ey, en = math.exp(zy - m), math.exp(zn - m)
    return ey / (ey + en)


def buy_quote(pool: Pool, side: str, amount_cents: int) -> Quote:
    """Spend `amount_cents`; return shares received (rounded DOWN)."""
    if amount_cents < MIN_TRADE_CENTS:
        raise ValueError("AMOUNT_TOO_SMALL")
    m_kes = amount_cents / 100.0
    qs, qo = (pool.q_yes, pool.q_no) if side == "YES" else (pool.q_no, pool.q_yes)

    # Δ = b·ln( e^(m/b + z) − e^(qo/b) ) − qs,  z = logsumexp(qs/b, qo/b)
    z = _logsumexp(qs / pool.b, qo / pool.b)
    a = m_kes / pool.b + z          # exponent of the grown pool
    c = qo / pool.b
    # stable ln(e^a − e^c) = a + ln(1 − e^(c−a));  a > c always since m > 0
    delta = pool.b * (a + math.log1p(-math.exp(c - a))) - qs

    shares = _round_down(delta)
    if shares <= 0:
        raise ValueError("AMOUNT_TOO_SMALL")

    new_qs = qs + shares
    new_pool = (Pool(pool.b, new_qs, qo) if side == "YES"
                else Pool(pool.b, qo, new_qs))
    return Quote(
        shares=shares,
        amount_cents=amount_cents,
        avg_price=m_kes / shares,
        price_yes_after=price_yes(new_pool),
        q_yes_after=new_pool.q_yes,
        q_no_after=new_pool.q_no,
    )


def sell_quote(pool: Pool, side: str, quantity: float) -> Quote:
    """Sell `quantity` shares back to the AMM; proceeds rounded DOWN to cents."""
    qs, qo = (pool.q_yes, pool.q_no) if side == "YES" else (pool.q_no, pool.q_yes)
    if quantity <= 0 or quantity > qs + 1e-9:
        raise ValueError("INSUFFICIENT_SHARES")

    new_qs = qs - quantity
    old = Pool(pool.b, qs, qo)
    new = Pool(pool.b, new_qs, qo)
    proceeds_kes = cost(old) - cost(new)
    amount_cents = int(proceeds_kes * 100)          # floor — house keeps dust
    if amount_cents <= 0:
        raise ValueError("AMOUNT_TOO_SMALL")

    new_pool = (Pool(pool.b, new_qs, qo) if side == "YES"
                else Pool(pool.b, qo, new_qs))
    return Quote(
        shares=quantity,
        amount_cents=amount_cents,
        avg_price=proceeds_kes / quantity,
        price_yes_after=price_yes(new_pool),
        q_yes_after=new_pool.q_yes,
        q_no_after=new_pool.q_no,
    )


def _round_down(x: float) -> float:
    f = 10 ** SHARE_DECIMALS
    return math.floor(x * f) / f
```

### Service-layer wiring (summary)

`TradingService.buy` (see backend doc) locks the wallet row and the
`market_pools` row `FOR UPDATE`, calls `buy_quote`, then atomically:

1. debits the wallet (ledger row `trade_buy`, negative amount),
2. writes `q_yes/q_no/price_yes/price_no/volume_cents` back to `market_pools`,
3. upserts the position: `quantity += shares`,
   `avg_price = (cost_cents + amount) / (q_old + shares) / 100`,
   `cost_cents += amount`,
4. inserts `trades` and `price_history` rows.

Sell mirrors it: proceeds credit, `realized_pnl_cents += proceeds −
quantity × old_avg_price × 100`, cost basis reduced proportionally.

### Resolution payout

For result = YES: every YES position gets `floor(quantity) × 100 // 1`…
precisely `int(quantity * PAYOUT_CENTS)` cents credited (ledger `payout`),
`realized_pnl_cents += payout − cost_cents`; NO positions get
`realized_pnl_cents −= cost_cents`. All positions marked `settled`.

## Exploit prevention checklist

| Threat | Defense |
|---|---|
| YES/NO arbitrage | Impossible: LMSR prices sum to 1 by construction |
| Rounding harvesting (many tiny trades) | Shares floored to 6dp, proceeds floored to cents, `MIN_TRADE_CENTS = KES 10` |
| Race on price (two trades same instant) | `market_pools` row `FOR UPDATE` — trades on a market are serialized |
| Self-trading to farm leaderboard | Leaderboard ranks **realized** P&L only; wash trading against the AMM strictly loses money (spread + floor rounding) |
| Quote/execute price gap | Optional `max_avg_price` / `min_avg_price` slippage guards on execute |
| Unbounded house loss | Capped at `b·ln(2)` per market — track aggregate exposure in admin dashboard |
| Trading after outcome is known | `end_date` enforced server-side at execute time; admins should set end_date *before* the real-world event |

## Property tests to write (tests/unit/test_engine.py)

1. `p_yes + p_no == 1` (within 1e-12) for random pools.
2. Round trip loses money: `sell(buy(m).shares).amount_cents <= m`.
3. Cost of buying Δ in one trade == cost in k split trades (within rounding,
   split never cheaper).
4. House loss at resolution ≤ `b·ln(2)·100` cents for random trade sequences.
5. Buying YES strictly increases `p_yes`; selling strictly decreases it.
```
