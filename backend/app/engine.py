"""LMSR market maker. Pure math — no DB, no I/O.

Units: cash in integer cents; shares as floats.
A winning share pays PAYOUT_CENTS (KES 1.00).
"""
from __future__ import annotations

import math
from dataclasses import dataclass

PAYOUT_CENTS = 100
SHARE_DECIMALS = 6
MIN_TRADE_CENTS = 1_000  # KES 10


@dataclass(frozen=True)
class Pool:
    b: float
    q_yes: float
    q_no: float


@dataclass(frozen=True)
class Quote:
    shares: float
    amount_cents: int
    avg_price: float
    price_yes_after: float
    q_yes_after: float
    q_no_after: float


def _logsumexp(a: float, c: float) -> float:
    m = max(a, c)
    return m + math.log(math.exp(a - m) + math.exp(c - m))


def cost(pool: Pool) -> float:
    return pool.b * _logsumexp(pool.q_yes / pool.b, pool.q_no / pool.b)


def price_yes(pool: Pool) -> float:
    zy, zn = pool.q_yes / pool.b, pool.q_no / pool.b
    m = max(zy, zn)
    ey, en = math.exp(zy - m), math.exp(zn - m)
    return ey / (ey + en)


def _round_down(x: float) -> float:
    f = 10**SHARE_DECIMALS
    return math.floor(x * f) / f


def buy_quote(pool: Pool, side: str, amount_cents: int) -> Quote:
    if amount_cents < MIN_TRADE_CENTS:
        raise ValueError("AMOUNT_TOO_SMALL")
    m_kes = amount_cents / 100.0
    qs, qo = (pool.q_yes, pool.q_no) if side == "YES" else (pool.q_no, pool.q_yes)

    z = _logsumexp(qs / pool.b, qo / pool.b)
    a = m_kes / pool.b + z
    c = qo / pool.b
    delta = pool.b * (a + math.log1p(-math.exp(c - a))) - qs

    shares = _round_down(delta)
    if shares <= 0:
        raise ValueError("AMOUNT_TOO_SMALL")

    new_qs = qs + shares
    new_pool = (
        Pool(pool.b, new_qs, qo) if side == "YES" else Pool(pool.b, qo, new_qs)
    )
    return Quote(
        shares=shares,
        amount_cents=amount_cents,
        avg_price=m_kes / shares,
        price_yes_after=price_yes(new_pool),
        q_yes_after=new_pool.q_yes,
        q_no_after=new_pool.q_no,
    )


def sell_quote(pool: Pool, side: str, quantity: float) -> Quote:
    qs, qo = (pool.q_yes, pool.q_no) if side == "YES" else (pool.q_no, pool.q_yes)
    if quantity <= 0 or quantity > qs + 1e-9:
        raise ValueError("INSUFFICIENT_SHARES")

    new_qs = qs - quantity
    proceeds_kes = cost(Pool(pool.b, qs, qo)) - cost(Pool(pool.b, new_qs, qo))
    amount_cents = int(proceeds_kes * 100)  # floor — house keeps dust
    if amount_cents <= 0:
        raise ValueError("AMOUNT_TOO_SMALL")

    new_pool = (
        Pool(pool.b, new_qs, qo) if side == "YES" else Pool(pool.b, qo, new_qs)
    )
    return Quote(
        shares=quantity,
        amount_cents=amount_cents,
        avg_price=proceeds_kes / quantity,
        price_yes_after=price_yes(new_pool),
        q_yes_after=new_pool.q_yes,
        q_no_after=new_pool.q_no,
    )


def seed_q_for_price(b: float, p: float) -> float:
    """q_yes offset so a fresh pool opens at probability p (q_no = 0)."""
    p = min(0.97, max(0.03, p))
    return b * math.log(p / (1 - p))
