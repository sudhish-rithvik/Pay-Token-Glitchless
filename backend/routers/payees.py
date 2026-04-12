from fastapi import APIRouter, HTTPException
from typing import List
from backend.schemas import PayeeCreate, PayeeResponse
from backend.supabase_client import get_supabase

router = APIRouter(
    prefix="/payees",
    tags=["payees"],
    responses={404: {"description": "Not found"}},
)

@router.get("/{user_id}", response_model=List[PayeeResponse])
def get_payees(user_id: str):
    supabase = get_supabase()
    try:
        response = supabase.table("payees").select("*").eq("user_id", user_id).execute()
        return [
            PayeeResponse(
                id=str(row["id"]), 
                user_id=row["user_id"], 
                name=row["name"],
                account_type=row["account_type"],
                account_identifier=row["account_identifier"]
            )
            for row in response.data
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=PayeeResponse)
def create_payee(payee: PayeeCreate):
    supabase = get_supabase()
    try:
        data = {
            "user_id": payee.user_id,
            "name": payee.name,
            "account_type": payee.account_type,
            "account_identifier": payee.account_identifier
        }
        response = supabase.table("payees").insert(data).execute()
        
        if response.data:
            row = response.data[0]
            return PayeeResponse(
                id=str(row["id"]),
                user_id=row["user_id"],
                name=row["name"],
                account_type=row["account_type"],
                account_identifier=row["account_identifier"]
            )
        raise HTTPException(status_code=500, detail="Failed to create payee")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{payee_id}")
def delete_payee(payee_id: str):
    supabase = get_supabase()
    try:
        supabase.table("payees").delete().eq("id", payee_id).execute()
        return {"detail": "Payee deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
