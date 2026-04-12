from pydantic import BaseModel
from typing import Optional, List, Dict, Any

# Auth Schemas
class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    # token: str  # Future: Add JWT token

# Account Schemas
class AccountCreate(BaseModel):
    user_id: str
    balance: float
    account_type: str = "CARD" # "CARD", "UPI", "NET_BANKING", "CRYPTO"
    # Card fields
    account_number: Optional[str] = None
    cvv: Optional[str] = None
    expiry_date: Optional[str] = None
    # UPI fields
    upi_id: Optional[str] = None
    # Net Banking fields
    ifsc: Optional[str] = None
    bank_name: Optional[str] = None
    # Crypto fields
    wallet_address: Optional[str] = None
    network: Optional[str] = None

class AccountResponse(BaseModel):
    id: str
    user_id: str
    balance: float
    account_type: str
    account_number: Optional[str] = None
    cvv: Optional[str] = None
    expiry_date: Optional[str] = None
    upi_id: Optional[str] = None
    ifsc: Optional[str] = None
    bank_name: Optional[str] = None
    wallet_address: Optional[str] = None
    network: Optional[str] = None

# Payee Schemas
class PayeeCreate(BaseModel):
    user_id: str
    name: str
    account_type: str
    account_identifier: str

class PayeeResponse(BaseModel):
    id: str
    user_id: str
    name: str
    account_type: str
    account_identifier: str

# Payment Schemas
class PaymentInitiate(BaseModel):
    from_account_id: str
    to_account_id: str
    amount: float
    currency: str = "INR"
    target_currency: str = "INR"
    method: Optional[str] = None
    auto_pick_method: bool = True
    need_instant: bool = False
    speed_mode: str = "Standard" # "Standard", "Priority", "Express"

class PaymentConfirm(BaseModel):
    transaction_id: str
    mark_failed: bool = False

class TransactionResponse(BaseModel):
    transaction_id: str
    from_account_id: str
    to_account_id: str
    amount: float
    currency: str
    target_currency: str = "INR"
    method: str
    status: str
    metadata: Dict[str, Any]
