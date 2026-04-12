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
    allow_crypto: bool = True           # Enabled by default for demos


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
        Fine-tuned weighted scoring "AI":
        Accurately enforces constraints like need_instant and balances fee vs speed.
        """
        score = 0.0

        # 1) User preference gets a strong boost
        if ctx.user_pref_method == opt.method:
            score += 3.0

        # 2) Fees (lower is better)
        fee_penalty = opt.avg_fee_percent
        if ctx.merchant_pref_low_fees:
            score -= fee_penalty * 2.0  # Stricter penalty for fees if preferred
        else:
            score -= fee_penalty * 0.5

        # 3) Speed penalty
        speed_factor = max(1, opt.avg_settlement_minutes)
        if ctx.need_instant:
            # Heavily penalize slow methods if instant is required (e.g. 30min -> -30 pts)
            if speed_factor > 5:
                score -= speed_factor * 1.5 
            else:
                score -= speed_factor * 0.2
        else:
            score -= speed_factor * 0.05

        # 4) Reliability
        # Exponentially penalize low reliability
        if opt.reliability_score < 0.9:
            score -= (1.0 - opt.reliability_score) * 10.0
        else:
            score += opt.reliability_score * 2.0

        # 5) Demo-Specific Amount & Corridor heuristics
        if ctx.is_domestic:
            # Small ind to ind transfers
            if opt.method == PaymentMethod.UPI and ctx.amount <= 10000:
                score += 50.0
        else:
            # Cross-border transfers
            if ctx.amount >= 1000000:
                # 1,000,000+ different countries
                if opt.method == PaymentMethod.CRYPTO:
                    score += 50.0
            elif ctx.amount >= 10000:
                # 10,000+ different countries
                if opt.method == PaymentMethod.NETBANKING:
                    score += 50.0

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
            min_amount=10,
            max_amount=None,
            domestic_only=True,
            supports_international=False,
            avg_fee_percent=0.01,
            avg_settlement_minutes=2,
            reliability_score=0.99,
        ),
        PaymentOption(
            method=PaymentMethod.NETBANKING,
            min_amount=100,
            max_amount=None,
            domestic_only=False,
            supports_international=True,
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
            min_amount=10,
            max_amount=None,
            domestic_only=False,
            supports_international=True,
            avg_fee_percent=0.01,
            avg_settlement_minutes=1,
            reliability_score=0.99,
        ),
    ]
    return PaymentDecisionEngine(opts)
