"""Groq-backed AI service: turn Kenyan commodity prices, macro indicators,
and headlines into economic commentary, forecasts, and recommendations.
Admin-only; the key never leaves the server."""
import json
import os
from typing import Any

import httpx

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get(
    "GROQ_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"
)
ENABLED = bool(GROQ_API_KEY)


class AiError(Exception):
    pass


TRENDS_PROMPT = """You are the news analyst for Utabiri, a Kenyan economics \
forecasting platform. Given today's Kenyan headlines, respond with JSON only, shaped exactly:
{
  "hottest": [
    {"topic": "<2-5 word topic>", "category": "Politics|Business|Sports|General",
     "sentiment": "positive|negative|neutral",
     "momentum": "rising|steady|cooling",
     "summary": "<one short sentence on why it's hot>"}
  ],
  "by_category": {
    "Politics": {"sentiment": "positive|negative|neutral",
                  "trending": ["<short phrase>", ...max 4],
                  "summary": "<one sentence>"},
    "Business": { ...same shape... },
    "Sports":   { ...same shape... }
  }
}

Rules:
- "hottest" is ranked by buzz across ALL categories, max 6 entries.
- Base everything ONLY on the provided headlines — do not invent events.
- sentiment reflects the tone of the coverage, not your opinion.
- Keep topics and phrases short and specific (names, institutions, events)."""


async def analyze_trends(headlines: list[dict[str, str]]) -> dict[str, Any]:
    """Sentiment + trending topics, overall and per category."""
    if not ENABLED:
        raise AiError("GROQ_API_KEY not configured")

    digest = "\n".join(
        f"- [{h.get('category', 'General')}] {h.get('title', '')} ({h.get('source', '')})"
        for h in headlines[:35]
    )

    async with httpx.AsyncClient(timeout=45.0) as client:
        r = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": TRENDS_PROMPT},
                    {"role": "user", "content": f"Today's headlines:\n{digest}"},
                ],
                "temperature": 0.3,
                "max_tokens": 1200,
                "response_format": {"type": "json_object"},
            },
        )
    if r.status_code >= 400:
        raise AiError(f"Groq HTTP {r.status_code}: {r.text[:200]}")
    try:
        data = json.loads(r.json()["choices"][0]["message"]["content"])
    except (json.JSONDecodeError, KeyError, IndexError):
        raise AiError("Groq returned malformed output")

    sentiments = {"positive", "negative", "neutral"}
    momenta = {"rising", "steady", "cooling"}

    hottest = []
    for h in (data.get("hottest") or [])[:6]:
        if not isinstance(h, dict) or not h.get("topic"):
            continue
        hottest.append({
            "topic": str(h["topic"])[:60],
            "category": str(h.get("category", "General"))[:20],
            "sentiment": h.get("sentiment") if h.get("sentiment") in sentiments else "neutral",
            "momentum": h.get("momentum") if h.get("momentum") in momenta else "steady",
            "summary": str(h.get("summary", ""))[:200],
        })

    by_category = {}
    for cat in ("Politics", "Business", "Sports"):
        c = (data.get("by_category") or {}).get(cat)
        if not isinstance(c, dict):
            continue
        by_category[cat] = {
            "sentiment": c.get("sentiment") if c.get("sentiment") in sentiments else "neutral",
            "trending": [str(t)[:60] for t in (c.get("trending") or [])[:4] if isinstance(t, str)],
            "summary": str(c.get("summary", ""))[:200],
        }

    return {"hottest": hottest, "by_category": by_category}


async def _groq_json(system: str, user_msg: str, max_tokens: int = 1800) -> dict[str, Any]:
    """Raw Groq call in JSON mode → parsed dict, no shape validation."""
    if not ENABLED:
        raise AiError("GROQ_API_KEY not configured")
    async with httpx.AsyncClient(timeout=45.0) as client:
        r = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_msg},
                ],
                "temperature": 0.5,
                "max_tokens": max_tokens,
                "response_format": {"type": "json_object"},
            },
        )
    if r.status_code >= 400:
        raise AiError(f"Groq HTTP {r.status_code}: {r.text[:200]}")
    try:
        return json.loads(r.json()["choices"][0]["message"]["content"])
    except (json.JSONDecodeError, KeyError, IndexError):
        raise AiError("Groq returned malformed output")


_SENTIMENTS = {"bullish", "bearish", "neutral"}


def _normalize_insight(item: dict, fallback_category: str) -> dict | None:
    if not isinstance(item, dict) or not item.get("title") or not item.get("body"):
        return None
    sentiment = item.get("sentiment")
    return {
        "title": str(item["title"])[:200],
        "body": str(item["body"])[:2000],
        "category": str(item.get("category") or fallback_category)[:40],
        "related_commodity": (str(item["related_commodity"])[:80] if item.get("related_commodity") else None),
        "related_indicator": (str(item["related_indicator"])[:80] if item.get("related_indicator") else None),
        "sentiment": sentiment if sentiment in _SENTIMENTS else None,
    }


COMMENTARY_PROMPT = """You are the economics editor for Utabiri, a Kenyan \
economics forecasting platform. Using the commodity prices, macro indicators, \
and headlines provided, write short market commentary pieces for Kenyan \
readers (farmers, traders, everyday consumers).

Respond with JSON only, shaped exactly as:
{
  "items": [
    {
      "title": "<short, specific headline, e.g. 'Maize prices climb in Kakamega as supply tightens'>",
      "body": "<2-4 sentences: what changed, likely cause, who it affects>",
      "category": "<one of: Agriculture, Macro, Forex, Markets, Trade, Energy>",
      "related_commodity": "<commodity name if applicable, else omit>",
      "related_indicator": "<indicator name if applicable, else omit>",
      "sentiment": "bullish|bearish|neutral"
    }, ...max 5
  ]
}

Rules:
- Base claims only on the data and headlines given — do not invent figures.
- Prefer specific counties/markets/numbers over vague statements.
- Keep language plain and actionable, not academic."""


async def generate_commentary(
    prices: list[dict[str, Any]],
    indicators: list[dict[str, Any]],
    headlines: list[dict[str, str]],
    category: str = "",
) -> list[dict[str, Any]]:
    price_digest = "\n".join(
        f"- {p.get('commodity')} @ {p.get('market')}, {p.get('county')}: "
        f"wholesale {p.get('wholesale_price')}, retail {p.get('retail_price')} ({p.get('price_date')})"
        for p in prices[:40]
    ) or "(no recent price data)"
    indicator_digest = "\n".join(
        f"- {i.get('name')}: {i.get('value')}{i.get('unit', '')} ({i.get('period')}, source {i.get('source')})"
        for i in indicators[:20]
    ) or "(no macro indicators recorded)"
    headline_digest = "\n".join(
        f"- [{h.get('category', 'General')}] {h.get('title', '')} ({h.get('source', '')})"
        for h in headlines[:25]
    ) or "(no headlines)"

    cat_instruction = (
        f"\n\nFocus ONLY on the '{category}' category." if category else ""
    )
    user_msg = (
        f"Commodity prices:\n{price_digest}\n\n"
        f"Macro indicators:\n{indicator_digest}\n\n"
        f"Headlines:\n{headline_digest}"
    )
    data = await _groq_json(COMMENTARY_PROMPT + cat_instruction, user_msg)
    fallback_cat = category or "Macro"
    out = []
    for item in (data.get("items") or [])[:5]:
        normalized = _normalize_insight(item, fallback_cat)
        if normalized:
            out.append(normalized)
    return out


FORECAST_PROMPT = """You are the forecasting analyst for Utabiri, a Kenyan \
economics platform. Given recent data points for one commodity or macro \
indicator, produce a short directional outlook.

Respond with JSON only, shaped exactly as:
{
  "title": "<short headline, e.g. 'Maize prices likely to ease over the next month'>",
  "body": "<2-4 sentences: the trend you observe, your outlook, and key uncertainty>",
  "sentiment": "bullish|bearish|neutral",
  "category": "<one of: Agriculture, Macro, Forex, Markets, Trade, Energy>"
}

Rules:
- Base the forecast only on the data points given.
- bullish = likely to rise, bearish = likely to fall, neutral = no clear direction.
- Be specific about timeframe and magnitude where the data supports it."""


async def generate_forecast(
    subject: str, recent_points: list[dict[str, Any]], category: str = ""
) -> dict[str, Any] | None:
    digest = "\n".join(
        f"- {p.get('date') or p.get('period')}: {p.get('value')}" for p in recent_points[:30]
    ) or "(no data points)"
    user_msg = f"Subject: {subject}\n\nRecent data points:\n{digest}"
    data = await _groq_json(FORECAST_PROMPT, user_msg, max_tokens=600)
    normalized = _normalize_insight(data, category or "Macro")
    if normalized:
        normalized["related_commodity"] = normalized["related_commodity"] or subject
    return normalized


RECOMMENDATION_PROMPT = """You are a personal economics advisor for Utabiri, \
a Kenyan economics platform. The reader follows the topics listed below. \
Using the context data, write short, actionable recommendations tailored to \
those interests (e.g. a maize farmer, a forex-watching trader).

Respond with JSON only, shaped exactly as:
{
  "items": [
    {
      "title": "<short, specific recommendation headline>",
      "body": "<2-4 sentences: the recommendation and why, tied to the reader's interest>",
      "category": "<one of: Agriculture, Macro, Forex, Markets, Trade, Energy>",
      "related_commodity": "<commodity name if applicable, else omit>",
      "related_indicator": "<indicator name if applicable, else omit>",
      "sentiment": "bullish|bearish|neutral"
    }, ...max 3 per interest, max 8 total
  ]
}

Rules:
- Every item must map to at least one of the reader's listed interests.
- Base claims only on the context data given.
- Keep recommendations concrete and practical, not generic advice."""


async def generate_recommendations(
    interest_tags: list[str], context: dict[str, Any]
) -> list[dict[str, Any]]:
    if not interest_tags:
        return []
    interests_digest = ", ".join(interest_tags[:10])
    context_digest = "\n".join(
        f"- {k}: {v}" for k, v in list(context.items())[:30]
    ) or "(no additional context)"
    user_msg = f"Reader's interests: {interests_digest}\n\nContext data:\n{context_digest}"
    data = await _groq_json(RECOMMENDATION_PROMPT, user_msg)
    out = []
    for item in (data.get("items") or [])[:8]:
        normalized = _normalize_insight(item, "Macro")
        if normalized:
            out.append(normalized)
    return out


# ── Daily Economic Briefing ───────────────────────────────────────────────
#
# Built as three chained Groq calls instead of one mega-prompt: each call's
# JSON schema stays small enough (~1.5-2k output tokens) to come back intact
# rather than risk truncation on a single giant structured response.

COMPARISON_COUNTRIES = [
    "United States", "China", "India", "South Africa", "Nigeria",
    "Ethiopia", "Rwanda", "Tanzania", "Uganda",
]

BRIEFING_SCORE_PROMPT = """You are the Chief Economist for Utabiri, a Kenyan \
economics platform. Using the context provided (recent headlines, commodity \
prices, macro indicators), produce a daily Kenya Economic Health assessment.

This is an AI analysis grounded in your general economic knowledge plus the \
context given — clearly an estimate, not a live data feed. Be specific and \
quantitative where you can, but do not fabricate precise statistics you are \
not reasonably confident in.

Respond with JSON only, shaped exactly as:
{
  "health_score": <integer 0-100>,
  "score_trend": "up|down|flat",
  "key_drivers": ["<short driver phrase>", ...max 6],
  "executive_summary": "<3-5 sentence summary of Kenya's economic state today>",
  "country_comparison": [
    {"country": "<name>", "gdp_growth": "<e.g. '5.2%'>", "inflation": "<e.g. '6.8%'>",
     "interest_rate": "<central bank policy rate>", "debt_to_gdp": "<e.g. '68%'>",
     "currency_strength": "strong|stable|weak", "competitiveness": "<one short phrase>"}
    , ... one entry per country listed below, same order
  ],
  "kenya_strengths": ["<short phrase>", ...max 5],
  "kenya_weaknesses": ["<short phrase>", ...max 5]
}

Countries to compare against Kenya, in this order: """ + ", ".join(COMPARISON_COUNTRIES)

BRIEFING_SECTOR_PROMPT = """You are the Chief Economist for Utabiri, a Kenyan \
economics platform. Using the context provided, assess sector-by-sector and \
household-income impact for Kenya today.

Respond with JSON only, shaped exactly as:
{
  "sector_impacts": [
    {"sector": "<name>", "rating": "winner|loser|neutral", "outlook": "<one short phrase>",
     "risk_level": "low|medium|high", "strategy": "<one short actionable phrase>"}
    , ... one entry per sector listed below, same order
  ],
  "personal_finance": {
    "low_income": {"cost_of_living": "<phrase>", "tax_burden": "<phrase>", "recommendation": "<phrase>"},
    "middle_income": {"cost_of_living": "<phrase>", "tax_burden": "<phrase>", "recommendation": "<phrase>"},
    "high_income": {"cost_of_living": "<phrase>", "tax_burden": "<phrase>", "recommendation": "<phrase>"}
  }
}

Sectors to assess, in this order: Retail, E-commerce, Technology, Real Estate, \
Manufacturing, Agriculture, Banking, Insurance, Logistics, Tourism, Healthcare, \
Education, Energy, Construction, Telecommunications"""

BRIEFING_STRATEGY_PROMPT = """You are the Chief Economist for Utabiri, a Kenyan \
economics platform. Using the context provided, give investment ideas and two \
contrasting economic-framework perspectives, plus closing recommendations.

Respond with JSON only, shaped exactly as:
{
  "investment_ideas": {
    "short_term": ["<idea>", ...max 4],
    "medium_term": ["<idea>", ...max 4],
    "long_term": ["<idea>", ...max 4],
    "risks": ["<risk>", ...max 4]
  },
  "austrian_view": "<3-5 sentences analyzing today's context through an Austrian-economics lens: government intervention risk, taxation distortions, capital formation, inflation from monetary expansion>",
  "classical_view": "<3-5 sentences analyzing today's context through a New Classical lens: market efficiency, rational expectations, incentive structures, fiscal sustainability>",
  "government_recommendations": ["<recommendation>", ...max 4],
  "business_recommendations": ["<recommendation>", ...max 4],
  "household_recommendations": ["<recommendation>", ...max 4]
}

Never provide political opinions — focus only on economic outcomes, incentives, risks and opportunities."""


def _context_digest(context: dict[str, Any]) -> str:
    headlines = context.get("headlines") or []
    prices = context.get("prices") or []
    indicators = context.get("indicators") or []
    parts = []
    if headlines:
        parts.append("Headlines:\n" + "\n".join(
            f"- [{h.get('category', 'General')}] {h.get('title', '')} ({h.get('source', '')})"
            for h in headlines[:25]
        ))
    if prices:
        parts.append("Commodity prices:\n" + "\n".join(
            f"- {p.get('commodity')} @ {p.get('market')}: retail {p.get('retail_price')} ({p.get('price_date')})"
            for p in prices[:20]
        ))
    if indicators:
        parts.append("Macro indicators:\n" + "\n".join(
            f"- {i.get('name')}: {i.get('value')}{i.get('unit', '')} ({i.get('period')})"
            for i in indicators[:15]
        ))
    if context.get("previous_score") is not None:
        parts.append(f"Yesterday's health score: {context['previous_score']}")
    return "\n\n".join(parts) or "(no additional context available today)"


async def generate_briefing(context: dict[str, Any]) -> dict[str, Any]:
    """Three chained Groq calls → one combined dict matching EconomicBriefing fields."""
    digest = _context_digest(context)

    score_data = await _groq_json(BRIEFING_SCORE_PROMPT, digest, max_tokens=2200)
    sector_data = await _groq_json(BRIEFING_SECTOR_PROMPT, digest, max_tokens=2200)
    strategy_data = await _groq_json(BRIEFING_STRATEGY_PROMPT, digest, max_tokens=1800)

    score = score_data.get("health_score")
    try:
        score = max(0, min(100, int(score)))
    except (TypeError, ValueError):
        score = 50

    return {
        "health_score": score,
        "score_trend": score_data.get("score_trend") if score_data.get("score_trend") in ("up", "down", "flat") else "flat",
        "executive_summary": str(score_data.get("executive_summary", ""))[:1000],
        "key_drivers": [str(d)[:100] for d in (score_data.get("key_drivers") or [])[:6]],
        "country_comparison": (score_data.get("country_comparison") or [])[:len(COMPARISON_COUNTRIES)],
        "kenya_strengths": [str(s)[:150] for s in (score_data.get("kenya_strengths") or [])[:5]],
        "kenya_weaknesses": [str(s)[:150] for s in (score_data.get("kenya_weaknesses") or [])[:5]],
        "sector_impacts": (sector_data.get("sector_impacts") or [])[:15],
        "personal_finance": sector_data.get("personal_finance") or {},
        "investment_ideas": strategy_data.get("investment_ideas") or {},
        "austrian_view": str(strategy_data.get("austrian_view", ""))[:1000],
        "classical_view": str(strategy_data.get("classical_view", ""))[:1000],
        "government_recommendations": [str(r)[:200] for r in (strategy_data.get("government_recommendations") or [])[:4]],
        "business_recommendations": [str(r)[:200] for r in (strategy_data.get("business_recommendations") or [])[:4]],
        "household_recommendations": [str(r)[:200] for r in (strategy_data.get("household_recommendations") or [])[:4]],
    }


# ── Finance Bill clause analysis ──────────────────────────────────────────

BILL_CLAUSE_PROMPT = """You are a Kenyan public policy and tax analyst. For \
each Bill clause given, explain its plain-English meaning and economic impact.

Respond with JSON only, shaped exactly as:
{
  "clauses": [
    {
      "clause_number": "<same number as given>",
      "plain_english": "<1-3 sentence plain-English explanation>",
      "who_benefits": "<short phrase>",
      "who_loses": "<short phrase>",
      "economic_impact": "<short phrase>",
      "tax_impact": "<short phrase, or 'none' if not tax-related>",
      "inflation_impact": "<short phrase>",
      "employment_impact": "<short phrase>",
      "investment_impact": "<short phrase>",
      "revenue_impact": "<short phrase>",
      "long_term_consequences": "<short phrase>",
      "hidden_taxes_or_burdens": "<short phrase, or 'none found'>",
      "loopholes_or_opportunities": "<short phrase, or 'none found'>"
    }, ... one per clause given, in the same order
  ]
}
Base everything only on the clause text given — do not invent provisions."""

BILL_SUMMARY_PROMPT = """You are a Kenyan public policy analyst. Given a list \
of already-analyzed Bill clauses, write a 4-6 sentence overall executive \
summary of the Bill's likely economic effect on Kenya — taxation, inflation, \
business compliance burden, and who benefits versus who loses overall. \
Respond with plain text only, no JSON, no markdown headers."""


async def analyze_bill_clauses(clauses: list[dict[str, str]]) -> list[dict[str, Any]]:
    """Batches clauses (5 at a time) through Groq to keep each call's output small."""
    results: list[dict[str, Any]] = []
    batch_size = 5
    for i in range(0, len(clauses), batch_size):
        batch = clauses[i:i + batch_size]
        parts = []
        for c in batch:
            heading_suffix = f" ({c['heading']})" if c.get("heading") else ""
            parts.append(f"Clause {c['clause_number']}{heading_suffix}:\n{c['text']}")
        digest = "\n\n".join(parts)
        try:
            data = await _groq_json(BILL_CLAUSE_PROMPT, digest, max_tokens=2500)
        except AiError:
            continue
        by_number = {str(item.get("clause_number")): item for item in (data.get("clauses") or []) if isinstance(item, dict)}
        for c in batch:
            item = by_number.get(c["clause_number"], {})
            results.append({
                "clause_number": c["clause_number"],
                "heading": c.get("heading", ""),
                "plain_english": str(item.get("plain_english", ""))[:600],
                "who_benefits": str(item.get("who_benefits", ""))[:200],
                "who_loses": str(item.get("who_loses", ""))[:200],
                "economic_impact": str(item.get("economic_impact", ""))[:200],
                "tax_impact": str(item.get("tax_impact", ""))[:200],
                "inflation_impact": str(item.get("inflation_impact", ""))[:200],
                "employment_impact": str(item.get("employment_impact", ""))[:200],
                "investment_impact": str(item.get("investment_impact", ""))[:200],
                "revenue_impact": str(item.get("revenue_impact", ""))[:200],
                "long_term_consequences": str(item.get("long_term_consequences", ""))[:300],
                "hidden_taxes_or_burdens": str(item.get("hidden_taxes_or_burdens", ""))[:200],
                "loopholes_or_opportunities": str(item.get("loopholes_or_opportunities", ""))[:200],
            })
    return results


async def summarize_bill(clauses: list[dict[str, Any]]) -> str:
    if not clauses:
        return ""
    digest = "\n".join(
        f"- Clause {c['clause_number']}: {c['plain_english']}" for c in clauses[:40]
    )
    async with httpx.AsyncClient(timeout=45.0) as client:
        r = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": BILL_SUMMARY_PROMPT},
                    {"role": "user", "content": digest},
                ],
                "temperature": 0.4,
                "max_tokens": 500,
            },
        )
    if r.status_code >= 400:
        raise AiError(f"Groq HTTP {r.status_code}: {r.text[:200]}")
    try:
        return r.json()["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError):
        raise AiError("Groq returned malformed output")
