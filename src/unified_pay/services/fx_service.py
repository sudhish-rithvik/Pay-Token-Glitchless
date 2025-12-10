# src/unified_pay/services/fx_service.py

from dataclasses import dataclass
from typing import Dict, Optional, List

import requests


@dataclass
class FXQuote:
    base: str
    date: str
    rates: Dict[str, float]


class FXService:
    """
    Small wrapper around the free Fawaz Ahmed Currency API:
    https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1

    - Supports 200+ fiat + crypto symbols
    - No API key, no rate limits (daily updated)
    - Same API for INR, USD, BTC, ETH, etc.
    """

    PRIMARY_BASE = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1"
    FALLBACK_BASE = "https://latest.currency-api.pages.dev/v1"

    def __init__(self, session: Optional[requests.Session] = None):
        self.session = session or requests.Session()

    def _fetch_rates(self, base: str) -> FXQuote:
        base = base.lower()
        last_error: Optional[Exception] = None
        for api_base in [self.PRIMARY_BASE, self.FALLBACK_BASE]:
            url = f"{api_base}/currencies/{base}.json"
            try:
                resp = self.session.get(url, timeout=5)
                resp.raise_for_status()
                data = resp.json()
                date = data.get("date", "latest")
                rates = data.get(base, {})
                if not isinstance(rates, dict):
                    raise ValueError("Unexpected rate format from FX API")
                return FXQuote(base=base, date=date, rates=rates)
            except Exception as e:  # noqa: BLE001
                last_error = e
                continue
        raise RuntimeError(f"Could not fetch FX rates for {base}: {last_error}")

    def get_rate(self, from_code: str, to_code: str) -> float:
        """
        Get conversion rate: 1 from_code -> X to_code
        e.g. get_rate('inr', 'usd') => 0.0119
        """
        from_code = from_code.lower()
        to_code = to_code.lower()

        if from_code == to_code:
            return 1.0

        quote = self._fetch_rates(from_code)
        if to_code not in quote.rates:
            raise ValueError(
                f"Currency '{to_code.upper()}' not supported for base '{from_code.upper()}'"
            )
        return float(quote.rates[to_code])

    def convert(self, amount: float, from_code: str, to_code: str) -> float:
        """Convert amount from one currency/crypto to another."""
        rate = self.get_rate(from_code, to_code)
        return amount * rate

    def get_popular_symbols(self) -> List[str]:
        """
        Convenience list for UI dropdowns.
        Includes common fiats + cryptos.
        """
        return [
            "INR",
            "USD",
            "EUR",
            "GBP",
            "AED",
            "SGD",
            "JPY",
            "CNY",
            "AUD",
            "CAD",
            # Crypto
            "BTC",
            "ETH",
            "USDT",
            "SOL",
            "BNB",
        ]
