"""
Local SQLite database client — replaces Supabase for prototype use.

The database file is created at:
  <project_root>/tokenone.db

On first run, all tables are created and sample data is seeded.
"""

import os
import sqlite3
import hashlib
import uuid
from contextlib import contextmanager

# Place the DB file at the project root (one level above /backend)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "tokenone.db")


@contextmanager
def get_db():
    """Context manager that yields a SQLite connection with row_factory set."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row          # allows dict-style access
    conn.execute("PRAGMA journal_mode=WAL") # better concurrency
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ─────────────────────────────────────────────
# Schema creation
# ─────────────────────────────────────────────

def _create_tables(conn: sqlite3.Connection):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id           TEXT PRIMARY KEY,
            username     TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at   TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS accounts (
            id             TEXT PRIMARY KEY,
            user_id        TEXT NOT NULL,
            balance        REAL NOT NULL DEFAULT 0,
            account_type   TEXT NOT NULL DEFAULT 'CARD',
            account_number TEXT UNIQUE,
            cvv            TEXT,
            expiry_date    TEXT,
            upi_id         TEXT,
            ifsc           TEXT,
            bank_name      TEXT,
            wallet_address TEXT,
            network        TEXT,
            created_at     TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);

        CREATE TABLE IF NOT EXISTS payees (
            id                  TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            user_id             TEXT NOT NULL,
            name                TEXT NOT NULL,
            account_type        TEXT NOT NULL,
            account_identifier  TEXT NOT NULL,
            created_at          TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_payees_user_id ON payees(user_id);
    """)


def _hash(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


# ─────────────────────────────────────────────
# Seed data
# ─────────────────────────────────────────────

def _seed(conn: sqlite3.Connection):
    """Insert sample data if it doesn't already exist (idempotent)."""

    # ── Users ──────────────────────────────────────────────────────────────────
    # rithvik  (password: rithvik123)
    # Nandhini, Raakesh, Dijo, Hema are receiver-only accounts (password: password123)
    users = [
        ("user_rithvik",   "rithvik",   _hash("rithvik123")),
        ("user_nandhini",  "nandhini",  _hash("password123")),
        ("user_raakesh",   "raakesh",   _hash("password123")),
        ("user_dijo",      "dijo",      _hash("password123")),
        ("user_hema",      "hema",      _hash("password123")),
    ]
    conn.executemany(
        "INSERT OR IGNORE INTO users (id, username, password_hash) VALUES (?, ?, ?)",
        users
    )

    # ── Accounts for rithvik ──────────────────────────────────────────────────
    rithvik_accounts = [
        # id, user_id, balance, account_type, account_number, cvv, expiry_date, upi_id, ifsc, bank_name, wallet_address, network
        ("acc_rv_upi",    "user_rithvik", 45200.00, "UPI",         None,               None,  None,    "rithvik@ybl",        None,          None,          None,                                           None),
        ("acc_rv_nb",     "user_rithvik", 182500.50, "NET_BANKING", "000011112222",     None,  None,    None,                "HDFC0001234", "HDFC Bank",   None,                                           None),
        ("acc_rv_card",   "user_rithvik", 28000.00, "CARD",        "4111222233334444", "321", "11/27", None,                None,          None,          None,                                           None),
        ("acc_rv_crypto", "user_rithvik", 12.75,    "CRYPTO",      None,               None,  None,    None,                None,          None,          "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", "Ethereum"),
    ]
    conn.executemany(
        """INSERT OR IGNORE INTO accounts
           (id, user_id, balance, account_type, account_number, cvv, expiry_date,
            upi_id, ifsc, bank_name, wallet_address, network)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        rithvik_accounts
    )

    # ── Accounts for receivers (various modes) ─────────────────────────────────
    receiver_accounts = [
        # Nandhini — UPI + Net Banking
        ("acc_nan_upi",  "user_nandhini", 18000.00, "UPI",         None,               None,  None,    "nandhini@oksbi",     None,          None,        None,                                           None),
        ("acc_nan_nb",   "user_nandhini", 94000.00, "NET_BANKING", "333344445555",     None,  None,    None,                "SBI0004321",  "State Bank of India", None,                                  None),

        # Raakesh — UPI + Card
        ("acc_rak_upi",  "user_raakesh",  22500.00, "UPI",         None,               None,  None,    "raakesh@paytm",     None,          None,        None,                                           None),
        ("acc_rak_card", "user_raakesh",  11000.00, "CARD",        "5555666677778888", "456", "03/28", None,                None,          None,        None,                                           None),

        # Dijo — Net Banking + Crypto
        ("acc_dij_nb",    "user_dijo",   55000.00, "NET_BANKING", "666677778888",     None,  None,    None,                "ICIC0005678", "ICICI Bank", None,                                           None),
        ("acc_dij_crypto","user_dijo",   3.2,      "CRYPTO",      None,               None,  None,    None,                None,          None,        "0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF", "Polygon"),

        # Hema — UPI + Card + Net Banking (all three)
        ("acc_hem_upi",  "user_hema",    31000.00, "UPI",         None,               None,  None,    "hema@okaxis",       None,          None,        None,                                           None),
        ("acc_hem_card", "user_hema",    9500.00,  "CARD",        "4242424242424242", "789", "06/29", None,                None,          None,        None,                                           None),
        ("acc_hem_nb",   "user_hema",    72000.00, "NET_BANKING", "999900001111",     None,  None,    None,                "AXIS0009876", "Axis Bank",  None,                                           None),
    ]
    conn.executemany(
        """INSERT OR IGNORE INTO accounts
           (id, user_id, balance, account_type, account_number, cvv, expiry_date,
            upi_id, ifsc, bank_name, wallet_address, network)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        receiver_accounts
    )

    # ── Payees for rithvik ─────────────────────────────────────────────────────
    payees = [
        ("payee_nan", "user_rithvik", "Nandhini",  "UPI",         "nandhini@oksbi"),
        ("payee_rak", "user_rithvik", "Raakesh",   "UPI",         "raakesh@paytm"),
        ("payee_dij", "user_rithvik", "Dijo",      "NET_BANKING", "666677778888"),
        ("payee_hem", "user_rithvik", "Hema",      "UPI",         "hema@okaxis"),
        ("payee_hc",  "user_rithvik", "Hema (Card)","CARD",       "4242424242424242"),
        ("payee_dc",  "user_rithvik", "Dijo (Crypto)","CRYPTO",   "0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF"),
    ]
    conn.executemany(
        "INSERT OR IGNORE INTO payees (id, user_id, name, account_type, account_identifier) VALUES (?,?,?,?,?)",
        payees
    )


# ─────────────────────────────────────────────
# Init — called once on startup from main.py
# ─────────────────────────────────────────────

def init_db():
    """Create tables and seed sample data. Safe to call multiple times."""
    with get_db() as conn:
        _create_tables(conn)
        _seed(conn)
    print(f"[TokenOne DB] SQLite ready at {DB_PATH}")
