# 7. Payments — Wallet + Lipana (Lipa na M-Pesa)

## Principles

1. **The webhook is the only thing that credits money.** Frontend redirects,
   "I have paid" buttons, and client-side callbacks are display-only.
2. **Every credit is idempotent.** Enforced at the database level
   (unique index on `lipana_transaction_id`), not just in application code.
3. **Every state is recoverable.** Pending deposits are reconciled against
   Lipana's API by the worker, so a missed webhook never strands money.

## Deposit sequence

```
 User            Frontend              Backend                Lipana          M-Pesa
  │ enter KES 500    │                     │                      │              │
  │─────────────────▶│ POST /wallet/deposit│                      │              │
  │                  │────────────────────▶│ create ledger row    │              │
  │                  │                     │ (deposit, pending)   │              │
  │                  │                     │ POST /v1/payment-links              │
  │                  │                     │─────────────────────▶│              │
  │                  │                     │◀── checkout_url ─────│              │
  │                  │◀─ {tx_id, url} ─────│                      │              │
  │  redirected to Lipana checkout ────────────────────────────▶ │              │
  │                  │                     │                      │── STK push ─▶│
  │  enters M-Pesa PIN on phone ───────────────────────────────────────────────▶│
  │                  │                     │◀── POST /webhooks/lipana (signed) ──│
  │                  │                     │ verify sig → archive │              │
  │                  │                     │ → credit (idempotent)│              │
  │                  │ poll GET /wallet/transactions/{tx_id}      │              │
  │                  │────────────────────▶│ status: completed    │              │
  │   "KES 500 added"│◀────────────────────│                      │              │
```

## Lipana client (`modules/payments/lipana.py`)

```python
class LipanaClient:
    def __init__(self, settings: Settings):
        self._http = httpx.AsyncClient(
            base_url="https://api.lipana.dev/v1",
            headers={"Authorization": f"Bearer {settings.LIPANA_SECRET_KEY}"},
            timeout=15.0,
        )

    async def create_payment_link(
        self, *, amount_kes: int, reference: str, phone: str | None,
    ) -> PaymentLink:
        """reference = our wallet_transactions.id — comes back in the webhook."""
        resp = await self._http.post("/payment-links", json={
            "amount": amount_kes,
            "currency": "KES",
            "reference": reference,
            "phone_number": phone,            # pre-fills STK push if known
            "redirect_url": f"{settings.FRONTEND_URL}/wallet/deposit/{reference}",
        })
        resp.raise_for_status()
        return PaymentLink.model_validate(resp.json()["data"])

    async def get_payment(self, payment_link_id: str) -> PaymentStatus:
        """Used by the reconciliation worker."""
        resp = await self._http.get(f"/payment-links/{payment_link_id}")
        resp.raise_for_status()
        return PaymentStatus.model_validate(resp.json()["data"])
```

If the Lipana call fails after we created the pending ledger row, the row is
marked `failed` in the same request — no orphaned pendings on the happy-path
error.

## Webhook endpoint (`POST /webhooks/lipana`)

```python
@router.post("/webhooks/lipana")
async def lipana_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    raw = await request.body()

    # 1. Authenticate: HMAC-SHA256 of the RAW body, constant-time compare
    sig = request.headers.get("X-Lipana-Signature", "")
    expected = hmac.new(settings.LIPANA_WEBHOOK_SECRET.encode(),
                        raw, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        await archive_event(db, raw, signature_ok=False)
        raise HTTPException(400, "invalid signature")

    payload = json.loads(raw)

    # 2. Archive first (uq_webhook_external dedupes retried deliveries)
    event = await archive_event(db, payload, signature_ok=True)
    if event is None:                 # duplicate delivery — already archived
        return {"status": "ok"}

    # 3. Dispatch; unknown event types are archived and ACKed
    handler = HANDLERS.get(payload["event"])
    if handler:
        try:
            await handler(payload["data"], db)
            await mark_processed(db, event.id)
        except BusinessRuleViolation as e:
            # e.g. amount mismatch — DO NOT 5xx (Lipana would retry forever).
            # Record the error and alert; an operator resolves it.
            await mark_failed(db, event.id, str(e))
    return {"status": "ok"}
```

## Idempotent crediting (`payments/service.py`)

```python
async def credit_deposit(data: dict, db: AsyncSession) -> None:
    async with db.begin():
        # Find our pending row via the reference we passed at link creation
        tx = await get_transaction_for_update(db, id=data["reference"])
        if tx is None:
            raise BusinessRuleViolation("unknown reference")
        if tx.status == "completed":
            return                                    # idempotent no-op
        if cents(data["amount"]) != tx.amount:
            raise BusinessRuleViolation("amount mismatch")  # alert, don't credit

        wallet = await lock_wallet(db, tx.user_id)     # FOR UPDATE
        wallet.balance += tx.amount
        tx.status = "completed"
        tx.completed_at = utcnow()
        tx.balance_after = wallet.balance
        tx.lipana_transaction_id = data["transaction_id"]  # unique index =
                                                           # hard double-credit stop
        await write_audit(db, "wallet.deposit_credited",
                          user_id=tx.user_id,
                          metadata={"tx": str(tx.id), "cents": tx.amount})
```

Three independent layers prevent double crediting:
1. `uq_webhook_external` — duplicate webhook deliveries are dropped at archive.
2. `tx.status == "completed"` check under `FOR UPDATE` — concurrent handlers
   serialize on the row.
3. `uq_wallet_tx_lipana` unique index — even a code bug cannot insert the same
   M-Pesa receipt twice; the transaction would roll back.

## Failure modes & recovery

| Failure | Handling |
|---|---|
| User abandons checkout | Ledger row stays `pending`; worker marks `expired` after link TTL (30 min). Nothing was credited. |
| Webhook never arrives | Reconciliation worker: pendings >10 min old → `GET /payment-links/{id}`; if paid, run the same `credit_deposit` path. |
| Webhook arrives twice | Layers 1–3 above; second delivery is a 200 no-op. |
| Amount mismatch / unknown reference | Archived with `error`, operator alerted (these indicate tampering or a Lipana bug — never auto-credit). |
| Our DB down when webhook arrives | 5xx → Lipana retries with backoff; reconciliation worker is the final backstop. |
| Lipana API down at deposit creation | User-facing 503 "Payments temporarily unavailable"; pending row marked `failed`. |

## Withdrawals (deliberately out of MVP scope)

Withdrawals (B2C payouts) need float management, KYC thresholds, and BCLB/AML
controls. The ledger already supports them (`wallet_tx_type` can grow a
`withdrawal` value); ship deposits + trading first, add withdrawals as the
first post-MVP milestone with manual admin approval per payout.
