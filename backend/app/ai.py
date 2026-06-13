"""Groq-backed AI service: turn Kenyan headlines into market suggestions
and short trend summaries. Admin-only; the key never leaves the server."""
import json
import os
from datetime import date
from typing import Any

import httpx

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get(
    "GROQ_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"
)
ENABLED = bool(GROQ_API_KEY)

SYSTEM_PROMPT = """You are the market-research analyst for Utabiri, a Kenyan \
prediction market where users trade YES/NO shares on future events.

Given today's Kenyan news headlines, respond with JSON only, shaped exactly as:
{
  "trends": ["<short trend phrase>", ...max 4],
  "suggestions": [
    {
      "question": "<binary, future-dated, objectively resolvable question ending in '?'>",
      "category": "<one of: Politics, Sports, Economy, Crypto, Elections, Business, Science, Entertainment>",
      "outcomes": [{"label": "Yes", "initial_price": <0.05-0.95>}],
      "rationale": "<one sentence: which headlines motivate this market>",
      "resolution_criteria": "<what source decides it, e.g. CBK statement, IEBC, CAF>",
      "end_date": "<YYYY-MM-DD, after the event can be known>"
    }, ...max 5
  ]
}

Rules:
- Questions must be about the FUTURE, verifiable from official sources
  (CBK, KNBS, IEBC, NSE, FIFA, CAF) or at least two major Kenyan outlets.
- Avoid markets about deaths, violence against individuals, or private people.
- initial_price is your honest probability estimate.
- Multi-outcome markets may list 2-4 outcomes instead of a single Yes."""


class AiError(Exception):
    pass


TRENDS_PROMPT = """You are the news analyst for Utabiri, a Kenyan prediction \
market. Given today's Kenyan headlines, respond with JSON only, shaped exactly:
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


async def _groq_suggest(system: str, user_msg: str) -> dict[str, Any]:
    """Raw Groq call → parsed + normalised suggestions dict."""
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
                "max_tokens": 1800,
                "response_format": {"type": "json_object"},
            },
        )
    if r.status_code >= 400:
        raise AiError(f"Groq HTTP {r.status_code}: {r.text[:200]}")
    try:
        data = json.loads(r.json()["choices"][0]["message"]["content"])
    except (json.JSONDecodeError, KeyError, IndexError):
        raise AiError("Groq returned malformed output")

    out: dict[str, Any] = {"trends": [], "suggestions": []}
    for t in (data.get("trends") or [])[:4]:
        if isinstance(t, str):
            out["trends"].append(t.strip())
    today = date.today().isoformat()
    for s in (data.get("suggestions") or [])[:5]:
        if not isinstance(s, dict) or not s.get("question"):
            continue
        end = str(s.get("end_date", ""))[:10]
        if end and end <= today:
            continue
        outcomes = []
        for o in (s.get("outcomes") or [{"label": "Yes", "initial_price": 0.5}])[:4]:
            try:
                p = min(0.95, max(0.05, float(o.get("initial_price", 0.5))))
            except (TypeError, ValueError):
                p = 0.5
            outcomes.append({"label": str(o.get("label", "Yes"))[:80], "initial_price": p})
        out["suggestions"].append({
            "question": str(s["question"])[:200],
            "category": str(s.get("category", "Politics"))[:40],
            "outcomes": outcomes or [{"label": "Yes", "initial_price": 0.5}],
            "rationale": str(s.get("rationale", ""))[:300],
            "resolution_criteria": str(s.get("resolution_criteria", ""))[:300],
            "end_date": str(s.get("end_date", ""))[:10],
        })
    return out


async def suggest_markets(
    headlines: list[dict[str, str]], category: str = ""
) -> dict[str, Any]:
    if not ENABLED:
        raise AiError("GROQ_API_KEY not configured")

    cat_instruction = (
        f"\n\nSTRICT RULE: You MUST generate suggestions ONLY about '{category}' topics. "
        f"Every single suggestion must have category='{category}'. "
        f"Do NOT generate Politics, Sports, or any other category unless that IS the requested category. "
        f"If the headlines don't contain {category} stories, IGNORE the headlines and instead "
        f"invent 5 original {category} prediction markets about Kenya using your own knowledge."
        if category
        else ""
    )
    system = SYSTEM_PROMPT + cat_instruction

    digest = "\n".join(
        f"- [{h.get('category', 'General')}] {h.get('title', '')} ({h.get('source', '')})"
        for h in headlines[:30]
    )

    # Repeat the category constraint in the user turn so the model can't miss it
    cat_prefix = (
        f"TARGET CATEGORY: {category} — generate ONLY {category} markets, no exceptions.\n\n"
        if category else ""
    )
    result = await _groq_suggest(system, f"{cat_prefix}Today's headlines:\n{digest}")

    # Drop any suggestions the AI tagged with the wrong category
    if category:
        cat_lower = category.lower()
        result["suggestions"] = [
            s for s in result["suggestions"]
            if cat_lower in s["category"].lower() or s["category"].lower() in cat_lower
        ]
        # Force the label on survivors so UI is consistent
        for s in result["suggestions"]:
            s["category"] = category

    # Guarantee at least 3 — pure-knowledge fallback, no headlines
    if len(result["suggestions"]) < 3:
        cat_label = category or "Kenyan"
        fallback_msg = (
            f"TARGET CATEGORY: {category}\n"
            f"Ignore the previous headlines. Generate exactly 5 brand-new {cat_label} prediction markets "
            f"for Kenya, resolvable within 30-90 days. Every market must be strictly about {cat_label}. "
            f"Do NOT generate any Politics or off-topic markets. "
            f"Base end_date values on today {date.today().isoformat()}."
        )
        fallback = await _groq_suggest(system, fallback_msg)
        if category:
            cat_lower = category.lower()
            fallback["suggestions"] = [
                s for s in fallback["suggestions"]
                if cat_lower in s["category"].lower() or s["category"].lower() in cat_lower
            ]
            for s in fallback["suggestions"]:
                s["category"] = category
        seen = {s["question"] for s in result["suggestions"]}
        for s in fallback["suggestions"]:
            if s["question"] not in seen and len(result["suggestions"]) < 5:
                result["suggestions"].append(s)
                seen.add(s["question"])
        if not result["trends"] and fallback["trends"]:
            result["trends"] = fallback["trends"]

    return result
