"""Sportsbook fixtures, tournament trees, live scores and markets API."""
from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Category, Market, Match, Outcome, Sport, Tournament

router = APIRouter(prefix="/sports", tags=["sports"])


@router.get("")
async def list_sports(db: AsyncSession = Depends(get_db)):
    """Returns active sports with count of active/upcoming matches."""
    sports = (await db.scalars(select(Sport).order_by(Sport.display_order))).all()
    result = []
    for s in sports:
        match_count = await db.scalar(
            select(func.count(Match.id)).where(
                Match.sport_id == s.id, Match.status.in_(["upcoming", "live"])
            )
        )
        result.append({
            "id": s.id,
            "name": s.name,
            "slug": s.slug,
            "active_matches": match_count or 0,
        })
    return {"items": result}


@router.get("/tree")
async def get_sports_tree(db: AsyncSession = Depends(get_db)):
    """Hierarchical tree: Sport > Category (Country) > Tournaments (Leagues)."""
    sports = (await db.scalars(select(Sport).order_by(Sport.display_order))).all()
    categories = (await db.scalars(select(Category).order_by(Category.display_order))).all()
    tournaments = (await db.scalars(select(Tournament).order_by(Tournament.display_order))).all()

    tree = []
    for s in sports:
        s_cats = [c for c in categories if c.sport_id == s.id]
        cat_list = []
        for c in s_cats:
            c_tourneys = [t for t in tournaments if t.category_id == c.id]
            cat_list.append({
                "id": c.id,
                "name": c.name,
                "country_code": c.country_code,
                "tournaments": [
                    {"id": t.id, "name": t.name, "slug": t.slug} for t in c_tourneys
                ],
            })
        tree.append({
            "id": s.id,
            "name": s.name,
            "slug": s.slug,
            "categories": cat_list,
        })
    return {"tree": tree}


@router.get("/matches")
async def list_matches(
    sport: str = "",
    tournament_id: str = "",
    status: str = "",
    featured: bool = False,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Returns dense match rows with inline 1X2, Over/Under 2.5, and BTTS odds."""
    stmt = select(Match)
    if sport:
        stmt = stmt.where(Match.sport_id == sport)
    if tournament_id:
        stmt = stmt.where(Match.tournament_id == tournament_id)
    if status:
        stmt = stmt.where(Match.status == status)
    if featured:
        stmt = stmt.where(Match.is_featured == True)  # noqa: E712

    stmt = stmt.order_by(Match.status == "live", Match.start_time.asc()).offset((page - 1) * per_page).limit(per_page)
    matches = (await db.scalars(stmt)).all()

    match_ids = [m.id for m in matches]
    markets = (
        await db.scalars(
            select(Market).where(Market.match_id.in_(match_ids)).order_by(Market.display_order)
        )
    ).all() if match_ids else []

    market_ids = [mk.id for mk in markets]
    outcomes = (
        await db.scalars(select(Outcome).where(Outcome.market_id.in_(market_ids)))
    ).all() if market_ids else []

    outcomes_by_market: dict[str, list[Outcome]] = {}
    for o in outcomes:
        outcomes_by_market.setdefault(o.market_id, []).append(o)

    markets_by_match: dict[str, list[Market]] = {}
    for mk in markets:
        markets_by_match.setdefault(mk.match_id, []).append(mk)

    items = []
    for m in matches:
        match_markets = markets_by_match.get(m.id, [])
        m1x2 = next((mk for mk in match_markets if mk.name == "1X2"), None)
        m_ou = next((mk for mk in match_markets if "Over/Under" in mk.name), None)
        m_btts = next((mk for mk in match_markets if "Both Teams" in mk.name), None)

        def get_outcomes_dict(mkt: Market | None) -> dict[str, Any]:
            if not mkt or mkt.is_suspended:
                return {"suspended": True, "outcomes": []}
            return {
                "market_id": mkt.id,
                "name": mkt.name,
                "suspended": mkt.is_suspended,
                "outcomes": [
                    {"id": o.id, "name": o.name, "odds": o.odds, "status": o.status}
                    for o in outcomes_by_market.get(mkt.id, [])
                ],
            }

        items.append({
            "id": m.id,
            "sport_id": m.sport_id,
            "tournament_id": m.tournament_id,
            "home_team": m.home_team,
            "away_team": m.away_team,
            "start_time": m.start_time.isoformat(),
            "status": m.status,
            "minute": m.minute,
            "home_score": m.home_score,
            "away_score": m.away_score,
            "is_suspended": m.is_suspended,
            "is_featured": m.is_featured,
            "market_1x2": get_outcomes_dict(m1x2),
            "market_ou": get_outcomes_dict(m_ou),
            "market_btts": get_outcomes_dict(m_btts),
            "total_markets_count": len(match_markets),
        })

    return {"items": items}


@router.get("/matches/{match_id}")
async def get_match_detail(match_id: str, db: AsyncSession = Depends(get_db)):
    """Full match details with all collapsible market sections."""
    match = await db.get(Match, match_id)
    if not match:
        raise HTTPException(404, "MATCH_NOT_FOUND")

    tournament = await db.get(Tournament, match.tournament_id)
    markets = (
        await db.scalars(
            select(Market).where(Market.match_id == match_id).order_by(Market.display_order)
        )
    ).all()

    market_ids = [mk.id for mk in markets]
    outcomes = (
        await db.scalars(select(Outcome).where(Outcome.market_id.in_(market_ids)))
    ).all() if market_ids else []

    outcomes_by_market: dict[str, list[Outcome]] = {}
    for o in outcomes:
        outcomes_by_market.setdefault(o.market_id, []).append(o)

    market_sections = []
    for mk in markets:
        market_sections.append({
            "id": mk.id,
            "name": mk.name,
            "market_type": mk.market_type,
            "is_suspended": mk.is_suspended or match.is_suspended,
            "outcomes": [
                {
                    "id": o.id,
                    "name": o.name,
                    "odds": o.odds,
                    "status": o.status,
                }
                for o in outcomes_by_market.get(mk.id, [])
            ],
        })

    return {
        "id": match.id,
        "sport_id": match.sport_id,
        "tournament_name": tournament.name if tournament else "League",
        "home_team": match.home_team,
        "away_team": match.away_team,
        "start_time": match.start_time.isoformat(),
        "status": match.status,
        "minute": match.minute,
        "home_score": match.home_score,
        "away_score": match.away_score,
        "is_suspended": match.is_suspended,
        "markets": market_sections,
    }


@router.get("/jackpot")
async def get_jackpot(db: AsyncSession = Depends(get_db)):
    """Returns the plain full-width jackpot strip fixtures."""
    matches = (
        await db.scalars(
            select(Match).where(Match.is_featured == True).order_by(Match.start_time.asc()).limit(13)
        )
    ).all()

    return {
        "title": "Utabiri Midweek Mega Jackpot",
        "prize_pool": "15,000,000 KES",
        "entry_stake": 50,
        "closes_at": matches[0].start_time.isoformat() if matches else datetime.now(timezone.utc).isoformat(),
        "matches_count": len(matches),
        "matches": [
            {
                "id": m.id,
                "home_team": m.home_team,
                "away_team": m.away_team,
                "start_time": m.start_time.isoformat(),
            }
            for m in matches
        ],
    }
