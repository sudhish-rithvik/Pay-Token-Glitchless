import unittest
from src.unified_pay.services.payment_processor import PaymentProcessor
from src.unified_pay.models.account import Account
from src.unified_pay.models.payment_method import PaymentMethod

class TestPaymentProcessor(unittest.TestCase):

    def setUp(self):
        self.processor = PaymentProcessor()
        self.sender_account = Account(account_id="acc123", user_id="user1", balance=1000)
        self.receiver_account = Account(account_id="acc456", user_id="user2", balance=500)

    def test_initiate_payment_success(self):
        amount = 100
        tx = self.processor.initiate_payment(
            from_account=self.sender_account,
            to_account=self.receiver_account,
            amount=amount,
            currency="INR"
        )
        self.assertIsInstance(tx, dict)
        self.assertEqual(tx["amount"], amount)
        self.assertEqual(tx["from_account_id"], "acc123")
        self.assertEqual(tx["to_account_id"], "acc456")
        self.assertEqual(tx["status"], "PENDING")

    def test_initiate_payment_invalid_amount(self):
        with self.assertRaises(ValueError):
            self.processor.initiate_payment(
                from_account=self.sender_account,
                to_account=self.receiver_account,
                amount=0
            )
        with self.assertRaises(ValueError):
            self.processor.initiate_payment(
                from_account=self.sender_account,
                to_account=self.receiver_account,
                amount=-50
            )

    def test_initiate_payment_same_account(self):
        with self.assertRaises(ValueError):
            self.processor.initiate_payment(
                from_account=self.sender_account,
                to_account=self.sender_account,
                amount=100
            )

    def test_confirm_payment_by_dict(self):
        tx = self.processor.initiate_payment(
            from_account=self.sender_account,
            to_account=self.receiver_account,
            amount=100
        )
        success = self.processor.confirm_payment(tx)
        self.assertTrue(success)
        self.assertEqual(tx["status"], "COMPLETED")

    def test_confirm_payment_by_id(self):
        tx = self.processor.initiate_payment(
            from_account=self.sender_account,
            to_account=self.receiver_account,
            amount=100
        )
        success = self.processor.confirm_payment(tx["transaction_id"])
        self.assertTrue(success)
        # Verify in processor storage
        stored_tx = self.processor.get_transaction(tx["transaction_id"])
        self.assertIsNotNone(stored_tx)
        self.assertEqual(stored_tx["status"], "COMPLETED")

    def test_confirm_payment_mark_failed(self):
        tx = self.processor.initiate_payment(
            from_account=self.sender_account,
            to_account=self.receiver_account,
            amount=100
        )
        success = self.processor.confirm_payment(tx, mark_failed=True)
        self.assertTrue(success)
        self.assertEqual(tx["status"], "FAILED")

    def test_confirm_payment_invalid_id(self):
        success = self.processor.confirm_payment("non_existent_tx_id")
        self.assertFalse(success)

if __name__ == '__main__':
    unittest.main()