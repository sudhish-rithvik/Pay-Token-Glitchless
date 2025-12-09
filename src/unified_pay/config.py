class Config:
    DATABASE_URL = "sqlite:///unified_payment_system.db"
    SECRET_KEY = "your_secret_key"
    PAY_TOKEN_EXPIRATION = 3600  # Token expiration time in seconds
    DEBUG = True  # Set to False in production
    ALLOWED_HOSTS = ["*"]  # Update with your allowed hosts in production