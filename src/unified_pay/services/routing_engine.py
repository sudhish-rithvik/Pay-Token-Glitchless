# src/unified_pay/services/routing_engine.py
from dataclasses import dataclass
from typing import List, Optional

from unified_pay.models.payment_method import PaymentMethod, PaymentOption


@dataclass
class PaymentContext:
    amount: float
    currency: str = "INR"
    is_domestic: bool = True            # inside India?
    need_instant: bool = True           # is speed critical?
    user_pref_method: Optional[PaymentMethod] = None
    merchant_pref_low_fees: bool = True
    allow_crypto: bool = False


class PaymentDecisionEngine:
    def __init__(self, options: List[PaymentOption]):
        self.options = options

    def _is_option_eligible(self, opt: PaymentOption, ctx: PaymentContext) -> bool:
        if ctx.amount < opt.min_amount:
            return False
        if opt.max_amount is not None and ctx.amount > opt.max_amount:
            return False

        if ctx.is_domestic and not opt.domestic_only and not opt.supports_international:
            # e.g. some rails may be intl-only, you can extend this rule
            pass

        if not ctx.is_domestic and not opt.supports_international:
            return False

        if opt.method == PaymentMethod.CRYPTO and not ctx.allow_crypto:
            return False

        return True

    def _score_option(self, opt: PaymentOption, ctx: PaymentContext) -> float:
        """
        Simple weighted scoring “AI”:
        higher is better. You can tune weights easily.
        """
        score = 0.0

        # 1) user preference gets a strong boost
        if ctx.user_pref_method == opt.method:
            score += 3.0

        # 2) fees (lower is better)
        fee_penalty = opt.avg_fee_percent  # e.g. 2% → -2 pts
        if ctx.merchant_pref_low_fees:
            score -= fee_penalty * 1.2
        else:
            score -= fee_penalty * 0.5

        # 3) speed (lower minutes is better, especially if need_instant)
        speed_factor = max(1, opt.avg_settlement_minutes)
        if ctx.need_instant:
            score -= speed_factor * 0.05  # harsher penalty
        else:
            score -= speed_factor * 0.02

        # 4) reliability
        score += opt.reliability_score * 2.0  # 0–2

        # 5) amount-based heuristic
        # e.g. discourage UPI for very large amounts (bank better)
        if opt.method == PaymentMethod.UPI and ctx.amount > 100000:
            score -= 2.0
        if opt.method in (PaymentMethod.BANK_TRANSFER, PaymentMethod.NETBANKING) and ctx.amount >= 50000:
            score += 1.5

        return score

    def recommend(self, ctx: PaymentContext) -> PaymentMethod:
        eligible = [opt for opt in self.options if self._is_option_eligible(opt, ctx)]
        if not eligible:
            # fall back to something safe like bank transfer
            return PaymentMethod.BANK_TRANSFER

        best_opt = max(eligible, key=lambda opt: self._score_option(opt, ctx))
        return best_opt.method


def default_decision_engine() -> PaymentDecisionEngine:
    """
    Default config tuned for India + global:
    tweak these values as you like.
    """
    opts = [
        PaymentOption(
            method=PaymentMethod.UPI,
            min_amount=1,
            max_amount=200000,  # UPI limit depends on bank, rough
            domestic_only=True,
            supports_international=False,
            avg_fee_percent=0.0,
            avg_settlement_minutes=1,
            reliability_score=0.95,
        ),
        PaymentOption(
            method=PaymentMethod.CARD,
            min_amount=10,
            max_amount=None,
            domestic_only=False,
            supports_international=True,
            avg_fee_percent=2.0,
            avg_settlement_minutes=1,
            reliability_score=0.9,
        ),
        PaymentOption(
            method=PaymentMethod.BANK_TRANSFER,
            min_amount=100,
            max_amount=None,
            domestic_only=True,
            supports_international=False,
            avg_fee_percent=0.25,
            avg_settlement_minutes=30,
            reliability_score=0.98,
        ),
        PaymentOption(
            method=PaymentMethod.NETBANKING,
            min_amount=100,
            max_amount=None,
            domestic_only=True,
            supports_international=False,
            avg_fee_percent=1.0,
            avg_settlement_minutes=5,
            reliability_score=0.92,
        ),
        PaymentOption(
            method=PaymentMethod.WALLET,
            min_amount=1,
            max_amount=50000,
            domestic_only=True,
            supports_international=False,
            avg_fee_percent=1.5,
            avg_settlement_minutes=1,
            reliability_score=0.85,
        ),
        PaymentOption(
            method=PaymentMethod.CRYPTO,
            min_amount=100,
            max_amount=None,
            domestic_only=False,
            supports_international=True,
            avg_fee_percent=0.5,
            avg_settlement_minutes=30,
            reliability_score=0.7,
        ),
    ]
    return PaymentDecisionEngine(opts)
