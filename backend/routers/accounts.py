from fastapi import APIRouter, HTTPException
from typing import List
import uuid
from backend.schemas import AccountCreate, AccountResponse
from backend.db import get_db

router = APIRouter(
    prefix="/accounts",
    tags=["accounts"],
    responses={404: {"description": "Not found"}},
)

def _row_to_response(row) -> AccountResponse:
    return AccountResponse(
        id=str(row["id"]),
        user_id=row["user_id"],
        balance=row["balance"],
        account_type=row["account_type"] or "CARD",
        account_number=row["account_number"],
        cvv=row["cvv"],
        expiry_date=row["expiry_date"],
        upi_id=row["upi_id"],
        ifsc=row["ifsc"],
        bank_name=row["bank_name"],
        wallet_address=row["wallet_address"],
        network=row["network"],
    )


@router.get("/{user_id}", response_model=List[AccountResponse])
def get_accounts(user_id: str):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at", (user_id,)
        ).fetchall()
    return [_row_to_response(r) for r in rows]


@router.post("/", response_model=AccountResponse)
def create_account(account: AccountCreate):
    acc_id = uuid.uuid4().hex
    with get_db() as conn:
        conn.execute(
            """INSERT INTO accounts
               (id, user_id, balance, account_type, account_number, cvv, expiry_date,
                upi_id, ifsc, bank_name, wallet_address, network)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                acc_id, account.user_id, account.balance, account.account_type,
                account.account_number, account.cvv, account.expiry_date,
                account.upi_id, account.ifsc, account.bank_name,
                account.wallet_address, account.network,
            )
        )
    return AccountResponse(id=acc_id, **account.dict())


@router.get("/lookup/{account_number}", response_model=AccountResponse)
def lookup_account(account_number: str):
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM accounts WHERE account_number = ?", (account_number,)
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Account not found")
    return _row_to_response(row)


@router.delete("/{account_id}")
def delete_account(account_id: str):
    with get_db() as conn:
        conn.execute("DELETE FROM accounts WHERE id = ?", (account_id,))
    return {"detail": "Account deleted successfully"}
