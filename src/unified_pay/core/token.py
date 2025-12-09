# ...existing code...
from typing import Optional
import uuid


class PAY_TOKEN:
    """
    Minimal token manager used by app and tests.

    Methods expected by tests:
    - generate_token(user_id) -> token string
    - validate_token(token) -> bool
    - revoke_token(token) -> None

    Also exposes `token_value` for compatibility with existing code.
    """
    def __init__(self, token_value: Optional[str] = None):
        # last generated or provided token value
        self.token_value: Optional[str] = token_value or None
        # internal store: token -> metadata
        self._tokens: dict[str, dict] = {}

    def generate_token(self, user_id: str) -> str:
        token = uuid.uuid4().hex
        self._tokens[token] = {"user_id": user_id, "revoked": False}
        self.token_value = token
        return token

    def validate_token(self, token: str) -> bool:
        meta = self._tokens.get(token)
        return bool(meta) and not meta.get("revoked", False)

    def revoke_token(self, token: str) -> None:
        meta = self._tokens.get(token)
        if meta:
            meta["revoked"] = True
            # if revoked token is the current token_value, clear it
            if self.token_value == token:
                self.token_value = None

    # backward-compatible helpers used by some code/tests
    def validate(self) -> bool:
        return bool(self.token_value) and self.validate_token(self.token_value)

    def revoke(self) -> None:
        if self.token_value:
            self.revoke_token(self.token_value)