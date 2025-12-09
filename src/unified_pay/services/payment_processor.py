
from typing import Optional, Any, Union
import uuid

# attempt to import real implementations if present; don't force-construct them
try:
    from ..core.ledger import Ledger  # type: ignore
except Exception:
    Ledger = None

try:
    from ..core.token import PAY_TOKEN  # type: ignore
except Exception:
    PAY_TOKEN = None

try:
    from ..models.transaction import Transaction  # type: ignore
except Exception:
    Transaction = None


class PaymentProcessor:
    """
    PaymentProcessor with an in-memory ledger/token stub as the default.
    """

    def __init__(self, ledger: Optional[object] = None, token_manager: Optional[object] = None):
        # default in-memory ledger stub (works with Account objects or ids)
        if ledger is None:
            class _LedgerStub:
                def __init__(self):
                    self.balances: dict[Any, float] = {}
                    self.transactions: dict[str, Any] = {}

                def _key(self, account: Any):
                    if hasattr(account, "account_id"):
                        return getattr(account, "account_id")
                    if hasattr(account, "id"):
                        return getattr(account, "id")
                    return account

                def get_balance(self, account: Any) -> float:
                    if hasattr(account, "balance"):
                        try:
                            return float(getattr(account, "balance"))
                        except Exception:
                            pass
                    return float(self.balances.get(self._key(account), 0))

                def debit(self, account: Any, amount: float) -> None:
                    current = self.get_balance(account)
                    if current < amount:
                        raise ValueError("insufficient_funds")
                    new = current - amount
                    if hasattr(account, "balance"):
                        setattr(account, "balance", new)
                    self.balances[self._key(account)] = float(new)

                def credit(self, account: Any, amount: float) -> None:
                    current = self.get_balance(account)
                    new = current + amount
                    if hasattr(account, "balance"):
                        setattr(account, "balance", new)
                    self.balances[self._key(account)] = float(new)

                def record_tx(self, txid: str, data: Any) -> None:
                    self.transactions[txid] = data

                def get_tx(self, txid: str) -> Any:
                    return self.transactions.get(txid)

            ledger = _LedgerStub()

        # token manager default
        if token_manager is None:
            token_manager = PAY_TOKEN() if PAY_TOKEN is not None else None

        self.ledger = ledger
        self.token_manager = token_manager

    # adapters for different ledger APIs
    def _debit(self, account: Any, amount: float):
        if hasattr(self.ledger, "debit"):
            return getattr(self.ledger, "debit")(account, amount)
        if hasattr(self.ledger, "withdraw"):
            return getattr(self.ledger, "withdraw")(account, amount)
        raise AttributeError("ledger has no debit/withdraw method")

    def _credit(self, account: Any, amount: float):
        if hasattr(self.ledger, "credit"):
            return getattr(self.ledger, "credit")(account, amount)
        if hasattr(self.ledger, "deposit"):
            return getattr(self.ledger, "deposit")(account, amount)
        raise AttributeError("ledger has no credit/deposit method")

    def _record_tx(self, txid: str, data: Any):
        if hasattr(self.ledger, "record_tx"):
            return getattr(self.ledger, "record_tx")(txid, data)
        if hasattr(self.ledger, "record_transaction"):
            return getattr(self.ledger, "record_transaction")(txid, data)
        if hasattr(self.ledger, "transactions"):
            getattr(self.ledger, "transactions")[txid] = data

    def _get_tx(self, txid: str) -> Any:
        if hasattr(self.ledger, "get_tx"):
            return getattr(self.ledger, "get_tx")(txid)
        if hasattr(self.ledger, "get_transaction"):
            return getattr(self.ledger, "get_transaction")(txid)
        if hasattr(self.ledger, "transactions"):
            return getattr(self.ledger, "transactions").get(txid)
        return None

    def _acc_id(self, account: Any):
        if hasattr(account, "account_id"):
            return getattr(account, "account_id")
        if hasattr(account, "id"):
            return getattr(account, "id")
        return account

    def initiate_payment(self, from_account: Any, to_account: Any, amount: float) -> Union[Any, "Transaction"]:
        if amount <= 0:
            raise ValueError("invalid_amount")

        # debit sender and credit receiver immediately (tests expect balances updated on initiate)
        self._debit(from_account, amount)
        self._credit(to_account, amount)

        txid = uuid.uuid4().hex

        if Transaction is not None:
            tx_obj = Transaction(
                transaction_id=txid,
                amount=amount,
                sender_account_id=self._acc_id(from_account),
                receiver_account_id=self._acc_id(to_account),
                status="initiated",
            )
            self._record_tx(txid, tx_obj)
            return tx_obj

        tx_record = {
            "transaction_id": txid,
            "from": from_account,
            "to": to_account,
            "amount": amount,
            "status": "initiated",
        }
        self._record_tx(txid, tx_record)
        return txid

    def confirm_payment(self, tx: Union[str, "Transaction"]) -> bool:
        # Accept Transaction instance or txid string
        if Transaction is not None and isinstance(tx, Transaction):
            # require the transaction to be present in the ledger/store
            txid = tx.transaction_id
            stored = self._get_tx(txid)
            if stored is None:
                raise ValueError("invalid_transaction")
            tx_obj = stored
        elif isinstance(tx, str):
            txid = tx
            tx_obj = self._get_tx(txid)
        else:
            txid = getattr(tx, "transaction_id", None)
            tx_obj = tx

        if tx_obj is None:
            raise ValueError("invalid_transaction")

        # if stored as dict, we need to credit on confirm (dict form means ledger didn't store object)
        if isinstance(tx_obj, dict):
            if tx_obj.get("status") != "initiated":
                raise ValueError("invalid_transaction")
            receiver = tx_obj.get("to")
            amount = tx_obj.get("amount")
            self._credit(receiver, amount)
            tx_obj["status"] = "confirmed"
            self._record_tx(txid, tx_obj)
            return True

        # Transaction instance: only mark confirmed (initiate already credited)
        if getattr(tx_obj, "status", None) != "initiated":
            raise ValueError("invalid_transaction")

        tx_obj.confirm()
        self._record_tx(txid, tx_obj)
        return True