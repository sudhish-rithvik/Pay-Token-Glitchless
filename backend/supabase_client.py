import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Read from custom keys found in the project's .env file:
SUPABASE_URL = os.getenv("DATABASE_URL", "https://vwessvbebzqpcyzmjius.supabase.co")
SUPABASE_KEY = os.getenv("PAY_TOKEN_SECRET", "sb_publishable_jttti8Rvnc1dF6Xay47dNg_nGWDqwNt")

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"Error: Could not initialize Supabase client: {e}")
    supabase = None

def get_supabase() -> Client:
    if not supabase:
        raise RuntimeError("Supabase client is not configured.")
    return supabase
