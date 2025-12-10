# src/unified_pay/models/payment_method.py
from enum import Enum
from dataclasses import dataclass
from typing import Optional


class PaymentMethod(str, Enum):
    UPI = "upi"
    CARD = "card"
    BANK_TRANSFER = "bank_transfer"
    WALLET = "wallet"
    CRYPTO = "crypto"
    NETBANKING = "netbanking"
    CASH = "cash"  # for completeness / offline


@dataclass
class PaymentOption:
    method: PaymentMethod
    min_amount: float = 0.0
    max_amount: Optional[float] = None
    domestic_only: bool = True
    supports_international: bool = False
    avg_fee_percent: float = 0.0        # approx % fee
    avg_settlement_minutes: int = 0     # speed
    reliability_score: float = 0.0      # 0–1
    supports_refund: bool = True
