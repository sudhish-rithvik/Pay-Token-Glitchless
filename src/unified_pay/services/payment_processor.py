"""
Payment processor for the unified payment system.

This module is intentionally self-contained and light on assumptions
about the rest of the codebase so it can be dropped into different
demo environments (CLI, API, Streamlit, etc).

Core responsibilities:
- Validate basic payment constraints (amount > 0, different accounts)
- Optionally let an "AI" decision engine choose the best payment method
- Create a transaction record (as a dict) that upstream callers can store
- Provide a simple `confirm_payment` hook for status updates

Balances are NOT mutated here – that can be done by higher-level
application logic once a transaction is confirmed.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any, Dict, Optional, Union

from unified_pay.models.payment_method import PaymentMethod
from unified_pay.services.routing_engine import (
    PaymentDecisionEngine,
    PaymentContext,
    default_decision_engine,
)


# Type alias for clarity: a transaction is represented as a dict.
TransactionDict = Dict[str, Any]


@dataclass
class PaymentProcessorConfig:
    """
    Configuration flags for the processor.

    You can extend this for more “policy”-level decisions, such as:
    - default currency
    - whether to allow crypto
    - merchant preferences (fees vs speed)
    """
    default_currency: str = "INR"
    # By default assume domestic (India) payments – callers can override per call.
    default_is_domestic: bool = True
    allow_crypto: bool = False
    merchant_pref_low_fees: bool = True


class PaymentProcessor:
    """
    Orchestrates payments across multiple rails (UPI, card, bank, etc.).

    This class is intentionally decoupled from storage.
    It returns transaction dictionaries; the caller is free to:
    - store them in a DB
    - attach them to a Ledger object
    - use them directly in a UI
    """

    def __init__(
        self,
        decision_engine: Optional[PaymentDecisionEngine] = None,
        config: Optional[PaymentProcessorConfig] = None,
    ) -> None:
        self.decision_engine: PaymentDecisionEngine = (
            decision_engine or default_decision_engine()
        )
        self.config: PaymentProcessorConfig = config or PaymentProcessorConfig()

        # Optional in-memory store (mainly for demos / tests / Streamlit)
        self._transactions: Dict[str, TransactionDict] = {}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def choose_payment_method(
        self,
        *,
        amount: float,
        currency: Optional[str] = None,
        is_domestic: Optional[bool] = None,
        need_instant: bool = True,
        user_pref: Optional[PaymentMethod] = None,
        allow_crypto: Optional[bool] = None,
        merchant_pref_low_fees: Optional[bool] = None,
    ) -> PaymentMethod:
        """
        Run the “AI” decision engine and return the recommended payment method.
        """

        if amount <= 0:
            raise ValueError("Amount must be positive to choose a payment method.")

        ctx = PaymentContext(
            amount=amount,
            currency=currency or self.config.default_currency,
            is_domestic=(
                self.config.default_is_domestic if is_domestic is None else is_domestic
            ),
            need_instant=need_instant,
            user_pref_method=user_pref,
            allow_crypto=(
                self.config.allow_crypto if allow_crypto is None else allow_crypto
            ),
            merchant_pref_low_fees=(
                self.config.merchant_pref_low_fees
                if merchant_pref_low_fees is None
                else merchant_pref_low_fees
            ),
        )
        return self.decision_engine.recommend(ctx)

    def initiate_payment(
        self,
        *,
        from_account: Any,
        to_account: Any,
        amount: float,
        currency: Optional[str] = None,
        method: Optional[PaymentMethod] = None,
        auto_pick_method: bool = True,
        need_instant: bool = True,
        user_pref: Optional[PaymentMethod] = None,
        is_domestic: Optional[bool] = None,
        allow_crypto: Optional[bool] = None,
        merchant_pref_low_fees: Optional[bool] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> TransactionDict:
        """
        Create a payment transaction.

        Parameters
        ----------
        from_account : Any
            Object with at least an `account_id` attribute.
        to_account : Any
            Object with at least an `account_id` attribute.
        amount : float
            Payment amount (must be > 0).
        currency : str, optional
            Currency code (default from config).
        method : PaymentMethod, optional
            Explicit method override (UPI, CARD, etc).
        auto_pick_method : bool
            If True and `method` is None, use the AI decision engine.
        need_instant : bool
            Hint for AI engine – how important is speed?
        user_pref : PaymentMethod, optional
            User’s preferred payment rail.
        is_domestic : bool, optional
            Whether this is a domestic payment; default from config.
        allow_crypto : bool, optional
            Whether crypto rails are allowed for this payment.
        merchant_pref_low_fees : bool, optional
            Merchant policy: prefer lower fees vs speed.
        metadata : dict, optional
            Free-form metadata to attach to the transaction.

        Returns
        -------
        dict
            A transaction dictionary with fields:
            - transaction_id
            - from_account_id
            - to_account_id
            - amount
            - currency
            - method
            - status
            - metadata
        """

        # ----- Basic validation -----
        if amount <= 0:
            raise ValueError("Amount must be positive.")

        if getattr(from_account, "account_id", None) is None:
            raise ValueError("from_account must have an 'account_id' attribute.")

        if getattr(to_account, "account_id", None) is None:
            raise ValueError("to_account must have an 'account_id' attribute.")

        if from_account.account_id == to_account.account_id:
            raise ValueError("Sender and receiver accounts must be different.")

        # ----- Decide payment method -----
        chosen_method: PaymentMethod
        if auto_pick_method and method is None:
            chosen_method = self.choose_payment_method(
                amount=amount,
                currency=currency,
                is_domestic=is_domestic,
                need_instant=need_instant,
                user_pref=user_pref,
                allow_crypto=allow_crypto,
                merchant_pref_low_fees=merchant_pref_low_fees,
            )
        else:
            # if manual method is provided, ensure it’s a PaymentMethod
            if method is None:
                raise ValueError(
                    "method must be provided if auto_pick_method is False."
                )
            chosen_method = method

        tx_id = uuid.uuid4().hex

        tx: TransactionDict = {
            "transaction_id": tx_id,
            "from_account_id": from_account.account_id,
            "to_account_id": to_account.account_id,
            "amount": float(amount),
            "currency": currency or self.config.default_currency,
            "method": chosen_method.value,
            "status": "PENDING",
            "metadata": metadata or {},
        }

        # Store in in-memory dict for demos / Streamlit
        self._transactions[tx_id] = tx

        return tx

    def confirm_payment(
        self,
        tx: Union[str, TransactionDict],
        *,
        mark_failed: bool = False,
    ) -> bool:
        """
        Confirm (or fail) a previously created transaction.

        This does NOT mutate account balances by design – that is left to the
        caller / outer application. Here we only update transaction status.

        Parameters
        ----------
        tx : str or dict
            Transaction ID or transaction dict.
        mark_failed : bool
            If True, mark transaction as FAILED instead of COMPLETED.

        Returns
        -------
        bool
            True if transaction was found and updated, False otherwise.
        """
        if isinstance(tx, str):
            tx_obj = self._transactions.get(tx)
            if tx_obj is None:
                return False
        else:
            tx_obj = tx
            tx_id = tx_obj.get("transaction_id")
            if tx_id:
                # keep store in sync
                self._transactions[tx_id] = tx_obj

        new_status = "FAILED" if mark_failed else "COMPLETED"
        tx_obj["status"] = new_status
        return True

    # ------------------------------------------------------------------
    # Convenience / debug helpers
    # ------------------------------------------------------------------
    def get_transaction(self, tx_id: str) -> Optional[TransactionDict]:
        """
        Fetch a transaction from the in-memory store.
        """
        return self._transactions.get(tx_id)

    def list_transactions(self) -> Dict[str, TransactionDict]:
        """
        Return a copy of all known transactions.
        """
        return dict(self._transactions)
