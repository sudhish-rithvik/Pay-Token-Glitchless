from pydantic import BaseModel
from typing import List, Optional

class UserSchema(BaseModel):
    user_id: str
    username: str

class AccountSchema(BaseModel):
    account_id: str
    user_id: str
    balance: float

class TransactionSchema(BaseModel):
    transaction_id: str
    amount: float
    sender_account_id: str
    receiver_account_id: str

class PaymentRequestSchema(BaseModel):
    amount: float
    sender_account_id: str
    receiver_account_id: str

class PaymentResponseSchema(BaseModel):
    transaction_id: str
    status: str

class TokenSchema(BaseModel):
    token: str
    user_id: str
    expires_at: Optional[str] = None

class ErrorResponseSchema(BaseModel):
    detail: str

class SuccessResponseSchema(BaseModel):
    message: str
    data: Optional[dict] = None

class PaginatedResponseSchema(BaseModel):
    total: int
    items: List[dict]