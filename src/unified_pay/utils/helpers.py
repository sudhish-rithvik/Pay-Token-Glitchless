def generate_unique_id():
    import uuid
    return str(uuid.uuid4())

def format_currency(amount):
    return "${:,.2f}".format(amount)

def validate_email(email):
    import re
    email_regex = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    return re.match(email_regex, email) is not None

def log_transaction(transaction_details):
    import logging
    logging.basicConfig(level=logging.INFO)
    logging.info(f"Transaction logged: {transaction_details}")