import unittest
from src.unified_pay.core.token import PAY_TOKEN

class TestPAYToken(unittest.TestCase):

    def setUp(self):
        self.token_manager = PAY_TOKEN()

    def test_generate_token(self):
        token = self.token_manager.generate_token(user_id="test_user")
        self.assertIsNotNone(token)
        self.assertIsInstance(token, str)

    def test_validate_token(self):
        token = self.token_manager.generate_token(user_id="test_user")
        is_valid = self.token_manager.validate_token(token)
        self.assertTrue(is_valid)

    def test_revoke_token(self):
        token = self.token_manager.generate_token(user_id="test_user")
        self.token_manager.revoke_token(token)
        is_valid = self.token_manager.validate_token(token)
        self.assertFalse(is_valid)

    def test_invalid_token(self):
        is_valid = self.token_manager.validate_token("invalid_token")
        self.assertFalse(is_valid)

if __name__ == '__main__':
    unittest.main()