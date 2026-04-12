from fastapi import APIRouter, HTTPException
from typing import List, Optional
from backend.schemas import PaymentInitiate, PaymentConfirm, TransactionResponse, AccountResponse
# Import core domain logic
from src.unified_pay.services.payment_processor import PaymentProcessor
from src.unified_pay.models.account import Account
from src.unified_pay.models.payment_method import PaymentMethod
from backend.supabase_client import get_supabase

router = APIRouter(
    prefix="/payments",
    tags=["payments"],
    responses={404: {"description": "Not found"}},
)

# Global processor instance (in-memory state for transactions)
processor = PaymentProcessor()

# Seed dummy transaction history
from datetime import datetime
_tx1 = "tx_abc12345grocery"
_tx2 = "tx_def67890networkerr"
_tx3 = "tx_ghi112233monthlyrent"

processor._transactions[_tx1] = {
    "transaction_id": _tx1,
    "from_account_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "to_account_id": "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b",
    "amount": 2500.0,
    "currency": "INR",
    "target_currency": "INR",
    "method": "CARD",
    "status": "COMPLETED",
    "metadata": {"timestamp": datetime.utcnow().isoformat(), "note": "Grocery store purchase"}
}

processor._transactions[_tx2] = {
    "transaction_id": _tx2,
    "from_account_id": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    "to_account_id": "f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c",
    "amount": 850.0,
    "currency": "INR",
    "target_currency": "INR",
    "method": "UPI",
    "status": "FAILED",
    "metadata": {"timestamp": datetime.utcnow().isoformat(), "note": "Failed transfer", "failure_reason": "Network Error"}
}

processor._transactions[_tx3] = {
    "transaction_id": _tx3,
    "from_account_id": "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
    "to_account_id": "0000555566667777",
    "amount": 25000.0,
    "currency": "INR",
    "target_currency": "INR",
    "method": "NET_BANKING",
    "status": "COMPLETED",
    "metadata": {"timestamp": datetime.utcnow().isoformat(), "note": "Monthly Rent"}
}

def get_account(account_id_or_number: str) -> Optional[Account]:
    supabase = get_supabase()
    try:
        res = supabase.table("accounts").select("*").or_(
            f"id.eq.{account_id_or_number},account_number.eq.{account_id_or_number},upi_id.eq.{account_id_or_number},wallet_address.eq.{account_id_or_number}"
        ).execute()
        if res.data:
            row = res.data[0]
            return Account(account_id=str(row["id"]), user_id=row["user_id"], balance=row["balance"])
    except Exception as e:
        print(f"Supabase get_account error: {e}")
            
    # Demo behavior: Auto-generate a mock account if it doesn't exist so the demo payment can proceed
    import uuid
    dummy_id = uuid.uuid4().hex
    return Account(account_id=dummy_id, user_id="demo_merchant", balance=0.0)

def update_account_balance(account_id: str, new_balance: float):
    supabase = get_supabase()
    try:
        supabase.table("accounts").update({"balance": new_balance}).eq("id", account_id).execute()
    except Exception as e:
        print(f"Supabase update error: {e}")

@router.get("/lookup/{account_identifier}", response_model=AccountResponse)
def lookup_account(account_identifier: str):
    supabase = get_supabase()
    
    # 1. Search accounts table
    try:
        res = supabase.table("accounts").select("*").or_(
            f"id.eq.{account_identifier},account_number.eq.{account_identifier},upi_id.eq.{account_identifier},wallet_address.eq.{account_identifier}"
        ).execute()
        if res.data:
            row = res.data[0]
            return AccountResponse(
                id=str(row["id"]),
                user_id=row["user_id"],
                balance=row["balance"],
                account_type=row.get("account_type", "CARD"),
                account_number=row.get("account_number"),
            )
    except Exception as e:
        print(f"Lookup error accounts: {e}")

    # 2. Search payees table
    try:
        res = supabase.table("payees").select("*").eq("account_identifier", account_identifier).execute()
        if res.data:
            row = res.data[0]
            return AccountResponse(
                id=str(row["id"]),
                user_id=row["name"],
                balance=0.0,
                account_type=row.get("account_type", "CARD"),
                account_number=account_identifier,
            )
    except Exception as e:
        print(f"Lookup error payees: {e}")

    # 3. If neither found, generate a random mock recipient for the demo
    import random
    import uuid
    names = ["Alice Smith", "Bob Jones", "Acme Corporation", "Global Needs NGO"]
    is_crypto = account_identifier.lower().startswith("0x")
    return AccountResponse(
        id=uuid.uuid4().hex,
        user_id=random.choice(names),
        balance=0.0,
        account_type="CRYPTO" if is_crypto else "CARD",
        account_number=account_identifier,
    )

@router.post("/initiate", response_model=TransactionResponse)
def initiate_payment(payment: PaymentInitiate):
    from_acc = get_account(payment.from_account_id)
    to_acc = get_account(payment.to_account_id)
    
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
            need_instant=payment.need_instant
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
        
    from_acc = get_account(tx["from_account_id"])
    to_acc = get_account(tx["to_account_id"])
    
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
    new_to_balance = to_acc.balance + tx["amount"]
    
    # Update Supabase
    update_account_balance(from_acc.account_id, new_from_balance)
    # Only try to update the receiver if it exists in DB (not a dummy)
    if to_acc and to_acc.user_id != "demo_merchant":
        update_account_balance(to_acc.account_id, new_to_balance)
    
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
    
    # Obfuscate sensitive accounts
    def obfuscate(acc_id):
        if not acc_id:
            return ""
        acc_str = str(acc_id)
        if len(acc_str) > 8:
            return acc_str[:4] + "***" + acc_str[-4:]
        return "***" + acc_str[-2:] if len(acc_str) > 2 else "***"
        
    obfuscated_tx = tx.copy()
    obfuscated_tx["from_account_id"] = obfuscate(tx.get("from_account_id", ""))
    obfuscated_tx["to_account_id"] = obfuscate(tx.get("to_account_id", ""))
    
    return TransactionResponse(**obfuscated_tx)

@router.delete("/history")
def clear_history():
    processor._transactions.clear()
    return {"message": "Transaction history cleared"}
