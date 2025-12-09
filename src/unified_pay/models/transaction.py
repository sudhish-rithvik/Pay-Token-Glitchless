from typing import Optional


class Transaction:
    def __init__(
        self,
        transaction_id: str,
        amount: float,
        sender_account_id: Optional[str] = None,
        receiver_account_id: Optional[str] = None,
        status: str = "initiated",
    ):
        self.transaction_id = transaction_id
        self.amount = amount
        self.sender_account_id = sender_account_id
        self.receiver_account_id = receiver_account_id
        self.status = status
        self.is_confirmed = (status == "confirmed")

    def confirm(self) -> None:
        self.status = "confirmed"
        self.is_confirmed = True

    def to_dict(self) -> dict:
        return {
            "transaction_id": self.transaction_id,
            "amount": self.amount,
            "sender_account_id": self.sender_account_id,
            "receiver_account_id": self.receiver_account_id,
            "status": self.status,
            "is_confirmed": self.is_confirmed,
        }