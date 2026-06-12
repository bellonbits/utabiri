"""Lipana API client (api.lipana.dev).

Auth: x-api-key header with the secret key (server-side only).
Verified endpoints:
  POST /v1/transactions   {amount, phone, reference}  -> M-Pesa STK push
  GET  /v1/transactions/{id}                          -> status poll
  POST /v1/payment-links  {title, amount, currency}   -> hosted page
  GET  /v1/payment-links/{id}                         -> link + metrics
Hosted checkout page: https://lipana.dev/pay/{slug}
"""
import os
from typing import Any

import httpx

BASE = "https://api.lipana.dev/v1"
SECRET_KEY = os.environ.get("LIPANA_SECRET_KEY", "")
PUBLIC_API_URL = os.environ.get("PUBLIC_API_URL", "https://api.suqafuran.com")

LIVE = bool(SECRET_KEY)


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url=BASE,
        headers={"x-api-key": SECRET_KEY, "Content-Type": "application/json"},
        timeout=20.0,
    )


class LipanaError(Exception):
    pass


async def stk_push(*, amount_kes: int, phone: str, reference: str) -> dict[str, Any]:
    """Fire an M-Pesa STK push. Returns provider payload (data dict)."""
    async with _client() as c:
        r = await c.post(
            "/transactions",
            json={"amount": amount_kes, "phone": phone, "reference": reference},
        )
        body = r.json()
        if r.status_code >= 400 or not body.get("success", False):
            raise LipanaError(body.get("message", f"HTTP {r.status_code}"))
        data = body.get("data", body)
        return data if isinstance(data, dict) else {"raw": data}


async def get_transaction(provider_tx_id: str) -> dict[str, Any] | None:
    async with _client() as c:
        r = await c.get(f"/transactions/{provider_tx_id}")
        if r.status_code == 404:
            return None
        body = r.json()
        if not body.get("success", False):
            return None
        data = body.get("data", {})
        return data if isinstance(data, dict) else None


def tx_id_of(data: dict[str, Any]) -> str | None:
    for k in ("_id", "id", "transactionId", "checkoutRequestId", "CheckoutRequestID"):
        if data.get(k):
            return str(data[k])
    return None


def is_paid(data: dict[str, Any]) -> bool:
    status = str(
        data.get("status") or data.get("state") or data.get("resultCode") or ""
    ).lower()
    return status in {"success", "successful", "completed", "complete", "paid", "0"}


def receipt_of(data: dict[str, Any]) -> str | None:
    for k in ("mpesaReceiptNumber", "MpesaReceiptNumber", "receipt", "receiptNumber",
              "mpesaReceipt", "transactionCode", "transaction_id"):
        if data.get(k):
            return str(data[k])
    return None
