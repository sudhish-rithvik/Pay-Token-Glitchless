class Account:
    def __init__(self, account_id, user_id, balance=0.0):
        self.account_id = account_id
        self.user_id = user_id
        self.balance = balance

    def deposit(self, amount):
        if amount > 0:
            self.balance += amount
            return True
        return False

    def withdraw(self, amount):
        if 0 < amount <= self.balance:
            self.balance -= amount
            return True
        return False

    def get_balance(self):
        return self.balance

    def __str__(self):
        return f"Account({self.account_id}, User({self.user_id}), Balance({self.balance}))"