from flask import Blueprint, request, jsonify
from unified_pay.models.user import User
from unified_pay.models.account import Account
from unified_pay.models.transaction import Transaction
from unified_pay.services.payment_processor import PaymentProcessor
from unified_pay.services.token_manager import TokenManager

api = Blueprint('api', __name__)

@api.route('/register', methods=['POST'])
def register_user():
    data = request.json
    user = User(username=data['username'])
    user.save()
    return jsonify({'message': 'User registered successfully', 'user_id': user.user_id}), 201

@api.route('/accounts', methods=['POST'])
def create_account():
    data = request.json
    account = Account(user_id=data['user_id'], balance=data['balance'])
    account.save()
    return jsonify({'message': 'Account created successfully', 'account_id': account.account_id}), 201

@api.route('/transactions', methods=['POST'])
def create_transaction():
    data = request.json
    transaction = Transaction(
        amount=data['amount'],
        sender_account_id=data['sender_account_id'],
        receiver_account_id=data['receiver_account_id']
    )
    transaction.save()
    return jsonify({'message': 'Transaction completed successfully', 'transaction_id': transaction.transaction_id}), 201

@api.route('/token', methods=['POST'])
def issue_token():
    token_manager = TokenManager()
    token = token_manager.issue_token()
    return jsonify({'token': token}), 200

@api.route('/token/validate', methods=['POST'])
def validate_token():
    data = request.json
    token_manager = TokenManager()
    is_valid = token_manager.validate_token(data['token'])
    return jsonify({'valid': is_valid}), 200