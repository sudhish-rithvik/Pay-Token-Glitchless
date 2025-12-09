import unittest
from src.unified_pay.services.payment_processor import PaymentProcessor
from src.unified_pay.models.account import Account
from src.unified_pay.models.transaction import Transaction

class TestPaymentProcessor(unittest.TestCase):

    def setUp(self):
        self.processor = PaymentProcessor()
        self.sender_account = Account(account_id="123", user_id="user1", balance=1000)
        self.receiver_account = Account(account_id="456", user_id="user2", balance=500)

    def test_initiate_payment_success(self):
        amount = 100
        transaction = self.processor.initiate_payment(self.sender_account, self.receiver_account, amount)
        self.assertIsInstance(transaction, Transaction)
        self.assertEqual(transaction.amount, amount)
        self.assertEqual(self.sender_account.balance, 900)
        self.assertEqual(self.receiver_account.balance, 600)

    def test_initiate_payment_insufficient_funds(self):
        amount = 1100
        with self.assertRaises(ValueError):
            self.processor.initiate_payment(self.sender_account, self.receiver_account, amount)

    def test_confirm_payment(self):
        amount = 100
        transaction = self.processor.initiate_payment(self.sender_account, self.receiver_account, amount)
        self.processor.confirm_payment(transaction)
        self.assertTrue(transaction.is_confirmed)

    def test_confirm_payment_invalid_transaction(self):
        invalid_transaction = Transaction(transaction_id="invalid", amount=100)
        with self.assertRaises(ValueError):
            self.processor.confirm_payment(invalid_transaction)

if __name__ == '__main__':
    unittest.main()