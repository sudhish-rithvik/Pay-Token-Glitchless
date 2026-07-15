from fastapi import APIRouter, HTTPException
from typing import List
import uuid
from backend.schemas import PayeeCreate, PayeeResponse
from backend.db import get_db

router = APIRouter(
    prefix="/payees",
    tags=["payees"],
    responses={404: {"description": "Not found"}},
)


@router.get("/{user_id}", response_model=List[PayeeResponse])
def get_payees(user_id: str):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM payees WHERE user_id = ? ORDER BY name", (user_id,)
        ).fetchall()
    return [
        PayeeResponse(
            id=str(r["id"]),
            user_id=r["user_id"],
            name=r["name"],
            account_type=r["account_type"],
            account_identifier=r["account_identifier"],
        )
        for r in rows
    ]


@router.post("/", response_model=PayeeResponse)
def create_payee(payee: PayeeCreate):
    payee_id = uuid.uuid4().hex
    with get_db() as conn:
        conn.execute(
            "INSERT INTO payees (id, user_id, name, account_type, account_identifier) VALUES (?,?,?,?,?)",
            (payee_id, payee.user_id, payee.name, payee.account_type, payee.account_identifier)
        )
    return PayeeResponse(
        id=payee_id,
        user_id=payee.user_id,
        name=payee.name,
        account_type=payee.account_type,
        account_identifier=payee.account_identifier,
    )


@router.delete("/{payee_id}")
def delete_payee(payee_id: str):
    with get_db() as conn:
        conn.execute("DELETE FROM payees WHERE id = ?", (payee_id,))
    return {"detail": "Payee deleted successfully"}
