from fastapi import APIRouter, HTTPException
from typing import List, Optional
from backend.schemas import PaymentInitiate, PaymentConfirm, TransactionResponse, AccountResponse
from src.unified_pay.services.payment_processor import PaymentProcessor
from src.unified_pay.models.account import Account
from src.unified_pay.models.payment_method import PaymentMethod
from backend.db import get_db
import uuid
from datetime import datetime

router = APIRouter(
    prefix="/payments",
    tags=["payments"],
    responses={404: {"description": "Not found"}},
)

# In-memory transaction store (same as before — no persistence needed for prototype)
processor = PaymentProcessor()

# ─── Seed dummy transaction history (uses real rithvik account IDs) ───────────
_tx1 = "tx_abc12345grocery"
_tx2 = "tx_def67890upi"
_tx3 = "tx_ghi112233rent"

processor._transactions[_tx1] = {
    "transaction_id": _tx1,
    "from_account_id": "acc_rv_card",
    "to_account_id":   "acc_hem_card",
    "amount": 1500.0,
    "currency": "INR",
    "target_currency": "INR",
    "method": "CARD",
    "status": "COMPLETED",
    "metadata": {"timestamp": datetime.utcnow().isoformat(), "note": "Grocery store payment to Hema"},
}

processor._transactions[_tx2] = {
    "transaction_id": _tx2,
    "from_account_id": "acc_rv_upi",
    "to_account_id":   "acc_nan_upi",
    "amount": 500.0,
    "currency": "INR",
    "target_currency": "INR",
    "method": "UPI",
    "status": "FAILED",
    "metadata": {"timestamp": datetime.utcnow().isoformat(), "note": "Transfer to Nandhini", "failure_reason": "Network timeout"},
}

processor._transactions[_tx3] = {
    "transaction_id": _tx3,
    "from_account_id": "acc_rv_nb",
    "to_account_id":   "acc_dij_nb",
    "amount": 25000.0,
    "currency": "INR",
    "target_currency": "INR",
    "method": "NET_BANKING",
    "status": "COMPLETED",
    "metadata": {"timestamp": datetime.utcnow().isoformat(), "note": "Monthly rent to Dijo"},
}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_account_from_db(identifier: str) -> Optional[Account]:
    """Look up an account by id, account_number, upi_id, or wallet_address."""
    with get_db() as conn:
        row = conn.execute(
            """SELECT * FROM accounts
               WHERE id = ?
                  OR account_number = ?
                  OR upi_id = ?
                  OR wallet_address = ?
               LIMIT 1""",
            (identifier, identifier, identifier, identifier)
        ).fetchone()
    if row:
        return Account(account_id=str(row["id"]), user_id=row["user_id"], balance=row["balance"])
    # Demo fallback — auto-generate a mock recipient so demo payments always proceed
    return Account(account_id=uuid.uuid4().hex, user_id="demo_recipient", balance=0.0)


def _update_balance(account_id: str, new_balance: float):
    with get_db() as conn:
        conn.execute(
            "UPDATE accounts SET balance = ? WHERE id = ?", (new_balance, account_id)
        )


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/lookup/{account_identifier}", response_model=AccountResponse)
def lookup_account(account_identifier: str):
    # 1. Search accounts table
    with get_db() as conn:
        row = conn.execute(
            """SELECT * FROM accounts
               WHERE id = ?
                  OR account_number = ?
                  OR upi_id = ?
                  OR wallet_address = ?
               LIMIT 1""",
            (account_identifier,) * 4
        ).fetchone()

    if row:
        return AccountResponse(
            id=str(row["id"]),
            user_id=row["user_id"],
            balance=row["balance"],
            account_type=row["account_type"] or "CARD",
            account_number=row["account_number"],
            upi_id=row["upi_id"],
            wallet_address=row["wallet_address"],
        )

    # 2. Search payees table
    with get_db() as conn:
        prow = conn.execute(
            "SELECT * FROM payees WHERE account_identifier = ? LIMIT 1",
            (account_identifier,)
        ).fetchone()

    if prow:
        return AccountResponse(
            id=str(prow["id"]),
            user_id=prow["name"],
            balance=0.0,
            account_type=prow["account_type"] or "CARD",
            account_number=account_identifier,
        )

    # 3. Mock fallback for demo
    is_crypto = account_identifier.lower().startswith("0x")
    return AccountResponse(
        id=uuid.uuid4().hex,
        user_id="Unknown Recipient",
        balance=0.0,
        account_type="CRYPTO" if is_crypto else "CARD",
        account_number=account_identifier,
    )


@router.post("/initiate", response_model=TransactionResponse)
def initiate_payment(payment: PaymentInitiate):
    from_acc = _get_account_from_db(payment.from_account_id)
    to_acc   = _get_account_from_db(payment.to_account_id)

    if not from_acc:
        raise HTTPException(status_code=404, detail="Sender account not found")

    try:
        method_enum = None
        if payment.method:
            try:
                method_enum = PaymentMethod(payment.method)
            except ValueError:
                pass

        tx = processor.initiate_payment(
            from_account=from_acc,
            to_account=to_acc,
            amount=payment.amount,
            currency=payment.currency,
            target_currency=payment.target_currency,
            method=method_enum,
            auto_pick_method=payment.auto_pick_method,
            need_instant=payment.need_instant,
        )
        tx["speed_mode"] = payment.speed_mode
        return TransactionResponse(**tx)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/confirm", response_model=TransactionResponse)
def confirm_payment(confirmation: PaymentConfirm):
    tx = processor.get_transaction(confirmation.transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    from_acc = _get_account_from_db(tx["from_account_id"])
    to_acc   = _get_account_from_db(tx["to_account_id"])

    if not from_acc:
        processor.confirm_payment(tx, mark_failed=True)
        tx["status"] = "FAILED"
        tx["metadata"]["failure_reason"] = "Sender account not found"
        return TransactionResponse(**tx)

    if confirmation.mark_failed:
        processor.confirm_payment(tx, mark_failed=True)
        return TransactionResponse(**tx)

    if from_acc.balance < tx["amount"]:
        processor.confirm_payment(tx, mark_failed=True)
        tx["status"] = "FAILED"
        tx["metadata"]["failure_reason"] = "Insufficient balance"
        return TransactionResponse(**tx)

    new_from_balance = from_acc.balance - tx["amount"]
    new_to_balance   = to_acc.balance + tx["amount"]

    _update_balance(from_acc.account_id, new_from_balance)
    if to_acc and to_acc.user_id != "demo_recipient":
        _update_balance(to_acc.account_id, new_to_balance)

    processor.confirm_payment(tx, mark_failed=False)
    return TransactionResponse(**tx)


@router.get("/history", response_model=List[TransactionResponse])
def get_history():
    return [TransactionResponse(**tx) for tx in processor.list_transactions().values()]


@router.get("/transaction/{tx_id}", response_model=TransactionResponse)
def get_transaction_details(tx_id: str):
    tx = processor.get_transaction(tx_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    def obfuscate(acc_id: str) -> str:
        s = str(acc_id)
        if len(s) > 8:
            return s[:4] + "***" + s[-4:]
        return "***" + s[-2:] if len(s) > 2 else "***"

    obfuscated = tx.copy()
    obfuscated["from_account_id"] = obfuscate(tx.get("from_account_id", ""))
    obfuscated["to_account_id"]   = obfuscate(tx.get("to_account_id", ""))
    return TransactionResponse(**obfuscated)


@router.delete("/history")
def clear_history():
    processor._transactions.clear()
    return {"message": "Transaction history cleared"}
