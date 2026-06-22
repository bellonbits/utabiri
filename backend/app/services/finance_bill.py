"""Fetches a Bill PDF (e.g. the Finance Bill from parliament.go.ke) and
splits it into clause-sized chunks for AI analysis."""
import re
from io import BytesIO

import httpx
from pypdf import PdfReader

MAX_CLAUSES = 60  # cap so a single admin-triggered run stays bounded

CLAUSE_RE = re.compile(
    r"^\s*(\d{1,3})\.\s+([^\n]*)",
    re.MULTILINE,
)


async def fetch_pdf_text(url: str) -> str:
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        r = await client.get(url)
        r.raise_for_status()
    reader = PdfReader(BytesIO(r.content))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def split_into_clauses(text: str) -> list[dict]:
    """Splits Bill text on numbered-clause headings ('12. Amendment of...').
    Falls back to fixed-size chunks if no clause markers are found."""
    matches = list(CLAUSE_RE.finditer(text))
    clauses: list[dict] = []
    if matches:
        for i, m in enumerate(matches[:MAX_CLAUSES]):
            start = m.start()
            end = matches[i + 1].start() if i + 1 < len(matches) else min(len(text), start + 4000)
            body = text[start:end].strip()
            if len(body) < 20:
                continue
            clauses.append({
                "clause_number": m.group(1),
                "heading": m.group(2).strip()[:120],
                "text": body[:3000],
            })
    if not clauses:
        # no recognizable clause numbering — chunk by characters
        chunk_size = 3000
        for i in range(0, min(len(text), chunk_size * MAX_CLAUSES), chunk_size):
            chunk = text[i:i + chunk_size].strip()
            if chunk:
                clauses.append({
                    "clause_number": str(len(clauses) + 1),
                    "heading": "",
                    "text": chunk,
                })
    return clauses[:MAX_CLAUSES]
