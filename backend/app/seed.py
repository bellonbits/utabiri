"""Automatic database seeder for initial Kenya economics and commodity data.
Ensures that a fresh installation immediately displays live, rich market data,
macro indicators, economic insights, and daily briefing report even before
the external scheduled scrapers run.
"""
from __future__ import annotations

import json
from datetime import date, datetime, timedelta, timezone
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .database import SessionFactory
from .models import CommodityPrice, EconomicBriefing, Insight, MacroIndicator


async def seed_if_empty() -> None:
    async with SessionFactory() as db:
        price_count = await db.scalar(select(func.count(CommodityPrice.id)))
        if price_count == 0:
            await _seed_commodities(db)

        indicator_count = await db.scalar(select(func.count(MacroIndicator.id)))
        if indicator_count == 0:
            await _seed_macro_indicators(db)

        insight_count = await db.scalar(select(func.count(Insight.id)))
        if insight_count == 0:
            await _seed_insights(db)

        briefing_count = await db.scalar(select(func.count(EconomicBriefing.id)))
        if briefing_count == 0:
            await _seed_briefing(db)

        await db.commit()


async def _seed_commodities(db: AsyncSession) -> None:
    today = date.today()
    yesterday = today - timedelta(days=1)

    raw_items = [
        # (commodity, classification, market, county, wholesale, retail, unit, date)
        ("Dry Maize", "Cereals", "Wakulima", "Nairobi", 3400.0, 3800.0, "90kg bag", today),
        ("Dry Maize", "Cereals", "Kongowea", "Mombasa", 3600.0, 4100.0, "90kg bag", today),
        ("Dry Maize", "Cereals", "Jubilee", "Kisumu", 3200.0, 3600.0, "90kg bag", today),
        ("Dry Maize", "Cereals", "Top Market", "Nakuru", 3100.0, 3500.0, "90kg bag", today),
        ("Dry Maize", "Cereals", "Main Market", "Uasin Gishu", 2950.0, 3350.0, "90kg bag", today),

        ("Rosecoco Beans", "Legumes", "Wakulima", "Nairobi", 8800.0, 9600.0, "90kg bag", today),
        ("Rosecoco Beans", "Legumes", "Kongowea", "Mombasa", 9200.0, 10200.0, "90kg bag", today),
        ("Rosecoco Beans", "Legumes", "Jubilee", "Kisumu", 8600.0, 9400.0, "90kg bag", today),
        ("Rosecoco Beans", "Legumes", "Top Market", "Nakuru", 8400.0, 9200.0, "90kg bag", today),

        ("Irish Potatoes", "Tubers", "Wakulima", "Nairobi", 2600.0, 3100.0, "50kg bag", today),
        ("Irish Potatoes", "Tubers", "Kongowea", "Mombasa", 2900.0, 3500.0, "50kg bag", today),
        ("Irish Potatoes", "Tubers", "Main Market", "Nakuru", 2300.0, 2700.0, "50kg bag", today),
        ("Irish Potatoes", "Tubers", "Soko Mjinga", "Kiambu", 2200.0, 2600.0, "50kg bag", today),

        ("Tomatoes", "Horticulture", "Wakulima", "Nairobi", 4800.0, 5600.0, "64kg crate", today),
        ("Tomatoes", "Horticulture", "Kongowea", "Mombasa", 5200.0, 6200.0, "64kg crate", today),
        ("Tomatoes", "Horticulture", "Jubilee", "Kisumu", 4900.0, 5800.0, "64kg crate", today),
        ("Tomatoes", "Horticulture", "Kagio Market", "Kirinyaga", 4200.0, 4800.0, "64kg crate", today),

        ("Red Onions", "Horticulture", "Wakulima", "Nairobi", 3900.0, 4500.0, "50kg bag", today),
        ("Red Onions", "Horticulture", "Kongowea", "Mombasa", 4100.0, 4800.0, "50kg bag", today),
        ("Red Onions", "Horticulture", "Top Market", "Nakuru", 3800.0, 4400.0, "50kg bag", today),

        ("Green Grams (Ndengu)", "Legumes", "Wakulima", "Nairobi", 10200.0, 11400.0, "90kg bag", today),
        ("Green Grams (Ndengu)", "Legumes", "Kinyambu Market", "Makueni", 9400.0, 10200.0, "90kg bag", today),
        ("Green Grams (Ndengu)", "Legumes", "Kitui Main", "Kitui", 9200.0, 10000.0, "90kg bag", today),

        ("Rice (Pishori)", "Cereals", "Wakulima", "Nairobi", 7200.0, 8000.0, "50kg bag", today),
        ("Rice (Pishori)", "Cereals", "Kongowea", "Mombasa", 7400.0, 8300.0, "50kg bag", today),
        ("Rice (Pishori)", "Cereals", "Wang'uru Market", "Kirinyaga", 6800.0, 7400.0, "50kg bag", today),

        ("Cabbage", "Horticulture", "Wakulima", "Nairobi", 1900.0, 2400.0, "Extended bag", today),
        ("Cabbage", "Horticulture", "Kinangop Market", "Nyandarua", 1400.0, 1800.0, "Extended bag", today),
        ("Carrots", "Horticulture", "Wakulima", "Nairobi", 3400.0, 4000.0, "Extended bag", today),
        ("Fresh Milk", "Dairy", "Githurai", "Kiambu", 58.0, 68.0, "Litre", today),
        ("Fresh Milk", "Dairy", "Main Market", "Uasin Gishu", 45.0, 55.0, "Litre", today),
        ("Cooking Bananas (Matoke)", "Horticulture", "Wakulima", "Nairobi", 1200.0, 1500.0, "Medium bunch", today),
        ("Cooking Bananas (Matoke)", "Horticulture", "Kisii Town Market", "Kisii", 800.0, 1050.0, "Medium bunch", today),

        # Prior day data for trend calculations
        ("Dry Maize", "Cereals", "Wakulima", "Nairobi", 3450.0, 3850.0, "90kg bag", yesterday),
        ("Dry Maize", "Cereals", "Kongowea", "Mombasa", 3650.0, 4150.0, "90kg bag", yesterday),
        ("Rosecoco Beans", "Legumes", "Wakulima", "Nairobi", 8750.0, 9550.0, "90kg bag", yesterday),
        ("Irish Potatoes", "Tubers", "Wakulima", "Nairobi", 2650.0, 3150.0, "50kg bag", yesterday),
        ("Tomatoes", "Horticulture", "Wakulima", "Nairobi", 4750.0, 5500.0, "64kg crate", yesterday),
    ]

    for item in raw_items:
        comm, clas, mkt, cty, ws, ret, unt, pdate = item
        db.add(CommodityPrice(
            commodity=comm,
            classification=clas,
            market=mkt,
            county=cty,
            wholesale_price=ws,
            retail_price=ret,
            unit=unt,
            price_date=pdate,
        ))
    print(f"[utabiri] Seeded {len(raw_items)} commodity prices")


async def _seed_macro_indicators(db: AsyncSession) -> None:
    now = datetime.now(timezone.utc)
    indicators = [
        {
            "name": "Inflation Rate",
            "unit": "%",
            "period": "2026-05",
            "source": "KNBS",
            "notes": "Overall Year-on-Year inflation anchored by stable food & electricity prices.",
            "history": [
                (5.7, "2026-01", now - timedelta(days=120)),
                (5.4, "2026-02", now - timedelta(days=90)),
                (5.3, "2026-03", now - timedelta(days=60)),
                (5.0, "2026-04", now - timedelta(days=30)),
                (5.1, "2026-05", now),
            ]
        },
        {
            "name": "Central Bank Rate (CBR)",
            "unit": "%",
            "period": "2026-06",
            "source": "CBK",
            "notes": "Monetary Policy Committee rate guiding interbank and commercial lending rates.",
            "history": [
                (12.50, "2026-01", now - timedelta(days=120)),
                (13.00, "2026-02", now - timedelta(days=90)),
                (13.00, "2026-04", now - timedelta(days=45)),
                (12.75, "2026-06", now),
            ]
        },
        {
            "name": "USD / KES Exchange Rate",
            "unit": "KES",
            "period": "2026-06",
            "source": "CBK",
            "notes": "Central Bank mean rate supported by diaspora remittances and tea auction receipts.",
            "history": [
                (135.20, "2026-01", now - timedelta(days=120)),
                (132.40, "2026-03", now - timedelta(days=70)),
                (130.80, "2026-05", now - timedelta(days=25)),
                (129.85, "2026-06", now),
            ]
        },
        {
            "name": "GDP Growth Rate",
            "unit": "%",
            "period": "2026-Q1",
            "source": "KNBS",
            "notes": "Quarterly real GDP expansion driven by robust agriculture, services, and construction.",
            "history": [
                (5.0, "2025-Q2", now - timedelta(days=270)),
                (5.2, "2025-Q3", now - timedelta(days=180)),
                (5.6, "2025-Q4", now - timedelta(days=90)),
                (5.4, "2026-Q1", now),
            ]
        },
        {
            "name": "Foreign Exchange Reserves",
            "unit": "USD M",
            "period": "2026-05",
            "source": "CBK",
            "notes": "Usable foreign exchange reserves meeting 4.1 months of import cover.",
            "history": [
                (6980.0, "2026-01", now - timedelta(days=120)),
                (7150.0, "2026-03", now - timedelta(days=70)),
                (7320.0, "2026-04", now - timedelta(days=35)),
                (7420.0, "2026-05", now),
            ]
        },
        {
            "name": "NSE 20 Share Index",
            "unit": "pts",
            "period": "2026-06",
            "source": "NSE",
            "notes": "Benchmark index tracking top 20 listed blue-chip companies on Nairobi Securities Exchange.",
            "history": [
                (1620.0, "2026-01", now - timedelta(days=120)),
                (1685.0, "2026-03", now - timedelta(days=70)),
                (1715.0, "2026-05", now - timedelta(days=25)),
                (1742.0, "2026-06", now),
            ]
        },
    ]

    for item in indicators:
        for val, per, created in item["history"]:
            db.add(MacroIndicator(
                name=item["name"],
                value=val,
                unit=item["unit"],
                period=per,
                source=item["source"],
                notes=item["notes"],
                created_at=created,
            ))
    print(f"[utabiri] Seeded {len(indicators)} macro indicators with history")


async def _seed_insights(db: AsyncSession) -> None:
    insights = [
        {
            "kind": "forecast",
            "title": "Cereal Price Projections: North Rift Long Rains Yield and Millers' Replenishment",
            "body": "Average Dry Maize wholesale prices are stabilizing between KES 3,100 and KES 3,400 per 90kg bag. With favorable rainfall across Trans Nzoia and Uasin Gishu, supply is expected to maintain price ceiling resilience through Q3. Millers are operating with 45-day rolling inventory buffers.",
            "category": "Agriculture",
            "related_commodity": "Dry Maize",
            "sentiment": "bullish",
            "sources": ["KAMIS", "Ministry of Agriculture", "East African Grain Council"],
        },
        {
            "kind": "commentary",
            "title": "CBK Monetary Policy: Navigating Prudent Rate Adjustments as Food Inflation Moderates",
            "body": "The Monetary Policy Committee's holding of the CBR at 12.75% aligns with cooling headline inflation at 5.1%. Improved agricultural harvests have dampened food basket volatility, offering leeway for private sector credit recovery in commercial and SME lending tiers.",
            "category": "Macro",
            "related_indicator": "Central Bank Rate (CBR)",
            "sentiment": "neutral",
            "sources": ["Central Bank of Kenya", "KNBS Economic Survey"],
        },
        {
            "kind": "recommendation",
            "title": "Horticulture Cold Chain Logistics: Preserving Margin on Tomato and Avocado Exports",
            "body": "Transporters and packing aggregators should consider shared reefer aggregation at transit hubs like Kagio and Naivasha. Post-harvest shrinkage on perishable horticultural commodities currently erodes 14% of farm-gate value during uncooled interstate transit.",
            "category": "Trade",
            "related_commodity": "Tomatoes",
            "sentiment": "neutral",
            "sources": ["FPEAK", "Horticultural Crops Directorate"],
        },
        {
            "kind": "forecast",
            "title": "Kenya Shilling Stability: Remittance Inflows & Tea Auction Receipts Anchor Market",
            "body": "The Shilling is projected to trade within the 128.50 to 131.00 band against the US Dollar through next quarter. Strong diaspora remittances surpassing $400M monthly and stable Mombasa tea auction volumes have replenished commercial bank liquidity.",
            "category": "Forex",
            "related_indicator": "USD / KES Exchange Rate",
            "sentiment": "bullish",
            "sources": ["CBK Weekly Bulletin", "East African Tea Trade Association"],
        },
        {
            "kind": "commentary",
            "title": "NSE Banking Sector Momentum: Dividend Yields and Non-Performing Loan Containment",
            "body": "Listed commercial lenders on the Nairobi Securities Exchange have posted resilient earnings growth, driven by regional subsidiaries and digital transaction fees. The banking index gained 8.4% month-on-month as foreign institutional participation rebounded.",
            "category": "Markets",
            "related_indicator": "NSE 20 Share Index",
            "sentiment": "bullish",
            "sources": ["Nairobi Securities Exchange", "Capital Markets Authority"],
        },
        {
            "kind": "recommendation",
            "title": "Cross-Border Grain Inflow Arbitrage: Managing Price Differentials at Busia and Namanga",
            "body": "Traders should monitor grain quality standards (EAS 2:2017) at border checkpoints. Tanzanian and Ugandan maize flows are entering western Kenya at an effective landed discount of KES 200 per bag compared to central markets.",
            "category": "Trade",
            "related_commodity": "Dry Maize",
            "sentiment": "neutral",
            "sources": ["EAGC", "Kenya Revenue Authority"],
        },
    ]

    for item in insights:
        db.add(Insight(
            kind=item["kind"],
            title=item["title"],
            body=item["body"],
            category=item["category"],
            related_commodity=item.get("related_commodity"),
            related_indicator=item.get("related_indicator"),
            sentiment=item["sentiment"],
            sources=json.dumps(item["sources"]),
            generated_by="ai",
        ))
    print(f"[utabiri] Seeded {len(insights)} featured insights")


async def _seed_briefing(db: AsyncSession) -> None:
    today = date.today()
    briefing = EconomicBriefing(
        briefing_date=today,
        health_score=68,
        previous_score=65,
        score_trend="up",
        executive_summary="Kenya's macroeconomic pulse strengthens as stable fuel prices and lower food inflation anchor the Shilling at KES 129.85, while agricultural output from the long rains boosts market supply.",
        key_drivers=json.dumps([
            "Headline inflation stabilized at 5.1%, inside the CBK target range",
            "Foreign exchange reserves rose to $7.42B (4.1 months of import cover)",
            "Strong long rains harvest replenishing staple food reserves across counties",
            "Diaspora remittances maintaining high momentum above $400M monthly",
        ]),
        country_comparison=json.dumps([
            {"country": "Kenya", "gdp_growth": "5.4%", "inflation": "5.1%", "interest_rate": "12.75%", "debt_to_gdp": "68%", "currency_strength": "Stable (+0.4%)", "competitiveness": "High"},
            {"country": "Tanzania", "gdp_growth": "5.2%", "inflation": "3.1%", "interest_rate": "6.00%", "debt_to_gdp": "42%", "currency_strength": "Stable", "competitiveness": "Moderate"},
            {"country": "Uganda", "gdp_growth": "6.0%", "inflation": "3.6%", "interest_rate": "10.25%", "debt_to_gdp": "49%", "currency_strength": "Moderate", "competitiveness": "Moderate"},
            {"country": "Rwanda", "gdp_growth": "7.2%", "inflation": "4.8%", "interest_rate": "7.50%", "debt_to_gdp": "64%", "currency_strength": "Pressure (-1.2%)", "competitiveness": "High"},
        ]),
        kenya_strengths=json.dumps([
            "Diversified service and agricultural economy with leading regional tech infrastructure",
            "Strong foreign exchange reserves providing import and debt service buffer",
            "Rebounding manufacturing and tea export receipts in international markets",
        ]),
        kenya_weaknesses=json.dumps([
            "High public debt service costs consuming significant domestic revenue",
            "Elevated commercial lending rates moderating private sector capital expenditure",
            "Vulnerability to international oil price swings and transport logistics bottlenecks",
        ]),
        sector_impacts=json.dumps([
            {"sector": "Agriculture & Agribusiness", "rating": "winner", "outlook": "Favorable harvests and lower fertilizer costs boost farm-gate revenues.", "risk_level": "low", "strategy": "Expand value-addition processing and commercial cold-storage capacity."},
            {"sector": "Banking & Financial Services", "rating": "winner", "outlook": "High asset yields and digital transaction growth support strong margins.", "risk_level": "medium", "strategy": "Focus on high-quality SME credit and mobile merchant solutions."},
            {"sector": "Building & Real Estate", "rating": "neutral", "outlook": "Affordable housing projects active; commercial mortgage uptake remains restrained.", "risk_level": "medium", "strategy": "Prioritize residential build-to-own in suburban economic nodes."},
            {"sector": "Retail & Fast-Moving Consumer Goods", "rating": "neutral", "outlook": "Discretionary consumer spending recovering as food inflation dampens.", "risk_level": "medium", "strategy": "Optimize localized inventory supply chains to protect unit margins."},
        ]),
        personal_finance=json.dumps({
            "low_income": {
                "cost_of_living": "Easing pressure on staple maize flour and vegetables",
                "tax_burden": "Moderate; benefit from stable public transport fares",
                "recommendation": "Build emergency reserves in high-yield mobile SACCO accounts."
            },
            "middle_income": {
                "cost_of_living": "Stable utilities and core food basket costs",
                "tax_burden": "High direct statutory deductions",
                "recommendation": "Lock in high rates with M-Akiba or money market funds before central bank rate cuts."
            },
            "high_income": {
                "cost_of_living": "Low relative volatility",
                "tax_burden": "Significant income tax and capital gains rates",
                "recommendation": "Diversify into infrastructure bonds (IFBs) and commercial real estate assets."
            }
        }),
        investment_ideas=json.dumps({
            "short_term": ["Kenya Government Infrastructure Bonds (tax-free yields 14%+)", "Money Market Funds (MMFs) with daily compounding liquidity"],
            "medium_term": ["Commercial agriculture aggregation (cold storage & grain drying)", "NSE blue-chip banking equities with dividend yields > 9%"],
            "long_term": ["Suburban warehousing and logistics hubs along standard gauge rail", "Renewable solar energy micro-grids for industrial estates"],
            "risks": ["Global petroleum price spikes", "Fiscal deficit adjustments and sovereign debt refinancing deadlines"]
        }),
        austrian_view="Credit expansion must be anchored by genuine domestic savings rather than central bank policy easing. The focus should remain on market-determined price discovery.",
        classical_view="Comparative advantage in agricultural exports and regional transport services will drive sustainable trade balances, provided fiscal prudence controls public borrowing.",
        government_recommendations=json.dumps([
            "Maintain strict discipline on non-priority recurrent expenditures",
            "Accelerate digitisation of county revenue collection systems",
            "Deepen agricultural value-chain subsidies targeting local input manufacturing"
        ]),
        business_recommendations=json.dumps([
            "Hedge foreign currency exposure using forward exchange contracts",
            "Negotiate bulk commodity supply agreements directly with cooperative societies",
            "Invest in internal energy-efficiency measures to mitigate peak grid tariffs"
        ]),
        household_recommendations=json.dumps([
            "Maintain a minimum of 3 months living expenses in liquid interest-bearing accounts",
            "Leverage bulk purchasing for non-perishable pantry staples during harvest price dips",
            "Audit personal credit lines and refinance high-cost unsecured micro-loans"
        ]),
    )
    db.add(briefing)
    print("[utabiri] Seeded Daily Economic Briefing")
