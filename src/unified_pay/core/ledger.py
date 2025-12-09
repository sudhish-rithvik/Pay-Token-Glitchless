class Ledger:
    def __init__(self):
        self.transactions = []

    def record_transaction(self, transaction):
        self.transactions.append(transaction)

    def get_transaction_history(self):
        return self.transactions

    def clear_ledger(self):
        self.transactions = []