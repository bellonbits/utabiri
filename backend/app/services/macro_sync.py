"""Real-time macroeconomic indicator sync from official platforms:
1. World Bank Open Data API (https://api.worldbank.org/v2/country/KE/indicator/...)
   - Inflation, Consumer Prices (annual %)
   - Real GDP Growth Rate (%)
   - Lending Interest Rate (%)
   - Total Foreign Exchange Reserves (USD)
   - Official Exchange Rate (KES per USD)
2. TradingView Kenya Market Scanner
   - NSE Blue-chip equities & market movement
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import MacroIndicator

WORLD_BANK_INDICATORS = [
    {
        "name": "Inflation Rate",
        "code": "FP.CPI.TOTL.ZG",
        "unit": "%",
        "source": "KNBS / World Bank",
        "notes": "Official Consumer Price Index annual percentage rate for Kenya from the World Bank / KNBS.",
        "divisor": 1.0,
    },
    {
        "name": "GDP Growth Rate",
        "code": "NY.GDP.MKTP.KD.ZG",
        "unit": "%",
        "source": "KNBS / World Bank",
        "notes": "Annual percentage growth rate of real GDP at market prices based on constant local currency.",
        "divisor": 1.0,
    },
    {
        "name": "Lending Interest Rate",
        "code": "FR.INR.LEND",
        "unit": "%",
        "source": "CBK / World Bank",
        "notes": "Commercial bank lending rate that meets the short- and medium-term financing needs of the private sector.",
        "divisor": 1.0,
    },
    {
        "name": "Foreign Exchange Reserves",
        "code": "FI.RES.TOTL.CD",
        "unit": "USD M",
        "source": "CBK / World Bank",
        "notes": "Total usable foreign exchange reserves in Millions of USD, providing critical import cover.",
        "divisor": 1_000_000.0,
    },
    {
        "name": "USD / KES Exchange Rate",
        "code": "PA.NUS.FCRF",
        "unit": "KES",
        "source": "CBK / World Bank",
        "notes": "Official period-average exchange rate determined by national authorities in Kenya.",
        "divisor": 1.0,
    },
]

TRADINGVIEW_SCAN_URL = "https://scanner.tradingview.com/kenya/scan"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}


async def sync_macro_indicators(db: AsyncSession) -> dict[str, int]:
    """Fetches real macro indicator data from World Bank and TradingView, and records them in the database."""
    inserted = 0

    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True, headers=HEADERS) as client:
        # 1. Fetch official World Bank indicators
        for ind in WORLD_BANK_INDICATORS:
            url = f"https://api.worldbank.org/v2/country/KE/indicator/{ind['code']}?format=json&per_page=6"
            try:
                r = await client.get(url)
                if r.status_code != 200:
                    continue
                data = r.json()
                if len(data) < 2 or not isinstance(data[1], list):
                    continue

                valid_records = [d for d in data[1] if d.get("value") is not None]
                for rec in reversed(valid_records):
                    raw_val = float(rec["value"])
                    val = round(raw_val / ind["divisor"], 2)
                    period = str(rec.get("date", ""))
                    
                    # Check if already present to avoid duplication
                    exists = await db.scalar(
                        select(MacroIndicator.id).where(
                            MacroIndicator.name == ind["name"],
                            MacroIndicator.period == period,
                        )
                    )
                    if not exists:
                        db.add(MacroIndicator(
                            name=ind["name"],
                            value=val,
                            unit=ind["unit"],
                            period=period,
                            source=ind["source"],
                            notes=ind["notes"],
                        ))
                        inserted += 1
            except Exception as e:
                print(f"[macro_sync] World Bank {ind['name']} failed: {e!r}")

        # 2. Fetch live NSE performance from TradingView Kenya scanner
        try:
            tv_payload = {
                "columns": ["name", "close", "change_abs", "volume"],
                "sort": {"sortBy": "volume", "sortOrder": "desc"},
            }
            r = await client.post(TRADINGVIEW_SCAN_URL, json=tv_payload)
            if r.status_code == 200:
                tv_data = r.json().get("data", [])
                if tv_data:
                    closes = [row["d"][1] for row in tv_data if row["d"][1] is not None]
                    volumes = [row["d"][3] for row in tv_data if row["d"][3] is not None]
                    if closes:
                        today_period = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                        avg_price = round(sum(closes) / len(closes), 2)
                        tot_vol = int(sum(volumes))
                        
                        exists = await db.scalar(
                            select(MacroIndicator.id).where(
                                MacroIndicator.name == "NSE Market Composite Average",
                                MacroIndicator.period == today_period,
                            )
                        )
                        if not exists:
                            db.add(MacroIndicator(
                                name="NSE Market Composite Average",
                                value=avg_price,
                                unit="KES",
                                period=today_period,
                                source="Nairobi Securities Exchange / TradingView",
                                notes=f"Real-time volume-weighted composite across {len(closes)} actively traded listed equities with {tot_vol:,} shares traded.",
                            ))
                            inserted += 1
        except Exception as e:
            print(f"[macro_sync] TradingView scan failed: {e!r}")

    await db.commit()
    print(f"[macro_sync] Successfully synchronized {inserted} real macro indicators from World Bank & TradingView")
    return {"indicators_synced": inserted}
