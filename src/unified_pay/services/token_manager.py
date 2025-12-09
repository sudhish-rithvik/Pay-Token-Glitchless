class TokenManager:
    def __init__(self):
        self.active_tokens = {}

    def issue_token(self, user_id):
        token = self._generate_token(user_id)
        self.active_tokens[token] = user_id
        return token

    def revoke_token(self, token):
        if token in self.active_tokens:
            del self.active_tokens[token]

    def _generate_token(self, user_id):
        import uuid
        return str(uuid.uuid4())

    def validate_token(self, token):
        return token in self.active_tokens

    def get_user_id(self, token):
        return self.active_tokens.get(token)