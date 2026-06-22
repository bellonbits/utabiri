import json

from .. import ai
from ..database import SessionFactory
from ..models import BillAnalysis
from . import finance_bill


async def run_analysis(bill_id: str, source_url: str) -> None:
    """Background job: fetch the PDF, split into clauses, analyze via Groq,
    and update the BillAnalysis row. Uses its own DB session since it
    outlives the HTTP request that triggered it."""
    async with SessionFactory() as db:
        bill = await db.get(BillAnalysis, bill_id)
        if bill is None:
            return
        try:
            text = await finance_bill.fetch_pdf_text(source_url)
            raw_clauses = finance_bill.split_into_clauses(text)
            if not raw_clauses:
                raise ValueError("No clauses could be extracted from this PDF")
            analyzed = await ai.analyze_bill_clauses(raw_clauses)
            summary = await ai.summarize_bill(analyzed)

            bill.clauses = json.dumps(analyzed)
            bill.overall_summary = summary
            bill.status = "done"
        except Exception as e:
            bill.status = "failed"
            bill.error = str(e)[:500]
        db.add(bill)
        await db.commit()
