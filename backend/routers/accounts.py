from fastapi import APIRouter, HTTPException
from typing import List
import uuid
from datetime import datetime
from backend.schemas import AccountCreate, AccountResponse
from backend.supabase_client import get_supabase

router = APIRouter(
    prefix="/accounts",
    tags=["accounts"],
    responses={404: {"description": "Not found"}},
)

@router.get("/{user_id}", response_model=List[AccountResponse])
def get_accounts(user_id: str):
    supabase = get_supabase()
    
    try:
        response = supabase.table("accounts").select("*").eq("user_id", user_id).execute()
        return [
            AccountResponse(
                id=str(row["id"]), 
                user_id=row["user_id"], 
                balance=row["balance"],
                account_type=row.get("account_type", "CARD"),
                account_number=row.get("account_number"),
                cvv=row.get("cvv"),
                expiry_date=row.get("expiry_date"),
                upi_id=row.get("upi_id"),
                ifsc=row.get("ifsc"),
                bank_name=row.get("bank_name"),
                wallet_address=row.get("wallet_address"),
                network=row.get("network")
            )
            for row in response.data
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase fetch failed: {str(e)}")

@router.post("/", response_model=AccountResponse)
def create_account(account: AccountCreate):
    acc_id = uuid.uuid4().hex
    supabase = get_supabase()

    data = {
        "id": acc_id,
        "user_id": account.user_id,
        "balance": account.balance,
        "account_type": account.account_type,
        "account_number": account.account_number,
        "cvv": account.cvv,
        "expiry_date": account.expiry_date,
        "upi_id": account.upi_id,
        "ifsc": account.ifsc,
        "bank_name": account.bank_name,
        "wallet_address": account.wallet_address,
        "network": account.network,
        "created_at": datetime.utcnow().isoformat()
    }
    try:
        supabase.table("accounts").insert(data).execute()
        return AccountResponse(id=acc_id, **account.dict())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create account in Supabase: {str(e)}")

@router.get("/lookup/{account_number}", response_model=AccountResponse)
def lookup_account(account_number: str):
    supabase = get_supabase()
        
    try:
        response = supabase.table("accounts").select("*").eq("account_number", account_number).execute()
        if response.data:
            row = response.data[0]
            return AccountResponse(
                id=str(row["id"]),
                user_id=row["user_id"],
                balance=row["balance"],
                account_type=row.get("account_type", "CARD"),
                account_number=row.get("account_number"),
            )
        else:
            raise HTTPException(status_code=404, detail="Account not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{account_id}")
def delete_account(account_id: str):
    supabase = get_supabase()
    
    try:
        supabase.table("accounts").delete().eq("id", account_id).execute()
        return {"detail": "Account deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
