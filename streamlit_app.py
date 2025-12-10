import os
import sys
import uuid
import importlib
import sqlite3
import hashlib
import time
from datetime import datetime

import streamlit as st


# =========================================================
#  GENERAL HELPERS
# =========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "auth.db")


def rerun():
    """Compatibility helper for rerunning the app."""
    try:
        st.rerun()
    except AttributeError:
        st.experimental_rerun()


# =========================================================
#  AUTH + ACCOUNT DB (SQLite) HELPERS
# =========================================================

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_auth_db():
    conn = get_db()
    cur = conn.cursor()

    # Auth users table
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        """
    )

    # Accounts table (belongs to auth users)
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            balance REAL NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        """
    )

    conn.commit()
    conn.close()


def hash_password(password: str) -> str:
    # Simple hash for demo; use bcrypt/argon2 for production.
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def register_user_db(username: str, password: str) -> str:
    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT 1 FROM users WHERE username = ?", (username,))
    if cur.fetchone():
        conn.close()
        raise ValueError("Username already exists")

    user_id = uuid.uuid4().hex
    pwd_hash = hash_password(password)
    cur.execute(
        "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
        (user_id, username, pwd_hash, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()
    return user_id


def authenticate_user_db(username: str, password: str):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, username, password_hash FROM users WHERE username = ?",
        (username,),
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        return None

    if hash_password(password) != row["password_hash"]:
        return None

    return {"id": row["id"], "username": row["username"]}


def create_account_db(user_id: str, balance: float) -> str:
    """Create an account row for the auth user in SQLite."""
    conn = get_db()
    cur = conn.cursor()
    acc_id = uuid.uuid4().hex
    cur.execute(
        "INSERT INTO accounts (id, user_id, balance, created_at) VALUES (?, ?, ?, ?)",
        (acc_id, user_id, balance, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()
    return acc_id


def get_accounts_for_user_db(user_id: str):
    """Return all accounts for a given auth user."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, user_id, balance FROM accounts WHERE user_id = ?",
        (user_id,),
    )
    rows = cur.fetchall()
    conn.close()
    return rows


# =========================================================
#  DYNAMIC IMPORT HELPER (unified_pay)
# =========================================================

def load_unified_pay():
    """
    Make sure src/ is on sys.path and then import unified_pay modules.
    Shows a nice error in the UI if something is wrong.
    """
    src_dir = os.path.join(BASE_DIR, "src")  # unified-payment-system/src

    if src_dir not in sys.path:
        sys.path.insert(0, src_dir)

    st.sidebar.write("🔍 Debug")
    st.sidebar.write("BASE_DIR:", BASE_DIR)
    st.sidebar.write("SRC_DIR:", src_dir)

    try:
        user_mod = importlib.import_module("unified_pay.models.user")
        account_mod = importlib.import_module("unified_pay.models.account")
        pp_mod = importlib.import_module("unified_pay.services.payment_processor")
        token_mod = importlib.import_module("unified_pay.core.token")
        pm_mod = importlib.import_module("unified_pay.models.payment_method")
    except ModuleNotFoundError as e:
        st.error(f"❌ Could not import unified_pay: {e}")
        st.stop()

    return (
        user_mod.User,
        account_mod.Account,
        pp_mod.PaymentProcessor,
        token_mod.PAY_TOKEN,
        pm_mod.PaymentMethod,
    )


# Initialise DB before anything else
init_auth_db()
User, Account, PaymentProcessor, PAY_TOKEN, PaymentMethod = load_unified_pay()


# =========================================================
#  SESSION STATE INIT
# =========================================================

def init_state():
    if "auth_user" not in st.session_state:
        st.session_state.auth_user = None  # {"id": ..., "username": ...}

    if "users" not in st.session_state:
        st.session_state.users = {}       # user_id -> User (unified_pay)
    if "accounts" not in st.session_state:
        st.session_state.accounts = {}    # acc_id -> Account (unified_pay)
    if "processor" not in st.session_state:
        st.session_state.processor = PaymentProcessor()
    if "token_mgr" not in st.session_state:
        st.session_state.token_mgr = PAY_TOKEN()
    if "transactions" not in st.session_state:
        st.session_state.transactions = {}  # txid -> tx_dict
    if "accounts_loaded_for_user" not in st.session_state:
        st.session_state.accounts_loaded_for_user = None


init_state()


# =========================================================
#  HELPERS FOR unified_pay USERS / ACCOUNTS
# =========================================================

def create_user_in_memory(user_id: str, username: str) -> User:
    """Create a unified_pay User object and store it in session_state."""
    user = User(user_id=user_id, username=username)
    st.session_state.users[user_id] = user
    return user


def create_demo_user(username: str) -> User:
    """Create a demo user (not in auth DB, just for playing)."""
    uid = uuid.uuid4().hex[:8]
    return create_user_in_memory(uid, username)


def create_account(user_id: str, balance: float) -> Account:
    """
    Create an account for a user.

    If the user_id is the **logged-in auth user**, also persist it in SQLite.
    """
    auth_user = st.session_state.auth_user
    if auth_user and user_id == auth_user["id"]:
        acc_id = create_account_db(user_id, balance)  # persistent
    else:
        acc_id = uuid.uuid4().hex[:8]  # in-memory only (demo)

    acc = Account(account_id=acc_id, user_id=user_id, balance=balance)
    st.session_state.accounts[acc_id] = acc
    return acc


def acc_label(acc: Account) -> str:
    user = st.session_state.users.get(acc.user_id)
    uname = user.username if user else "Unknown"
    return f"{acc.account_id} | {uname} | Balance: {acc.balance:.2f}"


def load_accounts_for_logged_in_user():
    """
    Load all accounts for the logged-in user from SQLite into memory.
    We only do this once per user per session.
    """
    auth_user = st.session_state.auth_user
    if not auth_user:
        return

    uid = auth_user["id"]
    if st.session_state.accounts_loaded_for_user == uid:
        return  # already loaded for this user

    rows = get_accounts_for_user_db(uid)

    # Remove any old accounts for this user from memory
    for acc_id, acc in list(st.session_state.accounts.items()):
        if getattr(acc, "user_id", None) == uid:
            del st.session_state.accounts[acc_id]

    # Load from DB
    for row in rows:
        acc = Account(
            account_id=row["id"],
            user_id=row["user_id"],
            balance=row["balance"],
        )
        st.session_state.accounts[row["id"]] = acc

    st.session_state.accounts_loaded_for_user = uid


# =========================================================
#  AUTO SETTLEMENT HELPER
# =========================================================

def auto_process_transaction(tx: dict, processor: PaymentProcessor, accounts: dict):
    """
    After a delay, automatically decide if the tx is COMPLETED or FAILED,
    update balances on success, and attach a failure_reason on failure.
    """
    from_acc = accounts.get(tx["from_account_id"])
    to_acc = accounts.get(tx["to_account_id"])
    amount = tx["amount"]

    reasons = []

    if from_acc is None or to_acc is None:
        reasons.append("One of the accounts no longer exists.")

    if from_acc is not None and from_acc.balance < amount:
        reasons.append("Insufficient balance in source account.")

    if tx["from_account_id"] == tx["to_account_id"]:
        reasons.append("Sender and receiver accounts are the same.")

    if reasons:
        # FAIL
        reason_text = "; ".join(reasons)
        processor.confirm_payment(tx, mark_failed=True)
        tx["status"] = "FAILED"
        tx["failure_reason"] = reason_text
        return "FAILED", reason_text
    else:
        # SUCCESS: update balances
        if from_acc is not None and to_acc is not None:
            from_acc.balance -= amount
            to_acc.balance += amount
        processor.confirm_payment(tx, mark_failed=False)
        tx["status"] = "COMPLETED"
        tx.pop("failure_reason", None)
        return "COMPLETED", ""


# =========================================================
#  PAGES
# =========================================================

def page_overview():
    st.title("💸 Unified Payment System – PAY_TOKEN Demo")
    st.markdown(
        """
        This Streamlit app sits on top of your **`unified_pay`** package and adds:

        - ✅ SQLite-based Login & Signup  
        - ✅ Accounts stored per logged-in user (persist across restarts)  
        - 🧠 AI-based payment method routing (UPI, Card, Bank, Wallet, Crypto…)  
        - 🤖 Auto-settlement of payments with reason on failure  
        - 🔐 PAY_TOKEN issue / validate / revoke  
        """
    )

    if st.session_state.auth_user:
        st.success(
            f"Logged in as **{st.session_state.auth_user['username']}** "
            f"(id: {st.session_state.auth_user['id']})"
        )
    else:
        st.info("You are not logged in. Go to **Auth / Login** page to sign in or sign up.")


def page_auth():
    st.header("🔐 Login / Sign Up")

    if st.session_state.auth_user:
        st.success(
            f"Already logged in as **{st.session_state.auth_user['username']}**"
        )
        if st.button("Logout"):
            st.session_state.auth_user = None
            st.session_state.accounts_loaded_for_user = None
            rerun()

    tab_login, tab_signup = st.tabs(["Login", "Sign Up"])

    # ---------- Login ----------
    with tab_login:
        st.subheader("Login")

        username = st.text_input("Username", key="login_username")
        password = st.text_input("Password", key="login_password", type="password")

        if st.button("Login", key="login_button"):
            if not username or not password:
                st.error("Please enter username and password.")
            else:
                user_data = authenticate_user_db(username, password)
                if not user_data:
                    st.error("Invalid username or password.")
                else:
                    if user_data["id"] not in st.session_state.users:
                        create_user_in_memory(user_data["id"], user_data["username"])

                    st.session_state.auth_user = user_data
                    st.session_state.accounts_loaded_for_user = None  # force reload
                    st.success(f"Welcome back, {user_data['username']}!")
                    rerun()

    # ---------- Sign Up ----------
    with tab_signup:
        st.subheader("Create a new account")

        su_username = st.text_input("Choose username", key="signup_username")
        su_password = st.text_input("Choose password", key="signup_password", type="password")
        su_password2 = st.text_input(
            "Confirm password", key="signup_password2", type="password"
        )

        if st.button("Sign Up", key="signup_button"):
            if not su_username or not su_password or not su_password2:
                st.error("All fields are required.")
            elif su_password != su_password2:
                st.error("Passwords do not match.")
            else:
                try:
                    user_id = register_user_db(su_username, su_password)
                    create_user_in_memory(user_id, su_username)
                    st.session_state.auth_user = {"id": user_id, "username": su_username}
                    st.session_state.accounts_loaded_for_user = None
                    st.success(f"Account created for {su_username}! You are now logged in.")
                    rerun()
                except ValueError as e:
                    st.error(str(e))


def require_login():
    """Guard pages that require authentication."""
    if not st.session_state.auth_user:
        st.warning("You must be logged in to access this page. Go to **Auth / Login**.")
        return False
    return True


def page_users_accounts():
    if not require_login():
        return

    load_accounts_for_logged_in_user()

    st.header("👤 Users & Accounts")

    auth_user = st.session_state.auth_user

    col1, col2 = st.columns(2)

    # ----- My accounts (persistent) -----
    with col1:
        st.subheader("My Accounts (saved in SQLite)")
        st.write(f"Logged in as: **{auth_user['username']}**")

        bal = st.number_input(
            "Initial Balance for new account", min_value=0.0, value=0.0, step=0.5
        )
        if st.button("Create My Account"):
            acc = create_account(auth_user["id"], bal)
            st.success(
                f"Account {acc.account_id} created for {auth_user['username']} "
                f"with balance {acc.balance:.2f}"
            )

    # ----- Demo users (optional) -----
    with col2:
        st.subheader("Demo Users (in-memory only)")
        uname = st.text_input("Demo username", key="demo_uname_input")
        if st.button("Create Demo User"):
            if not uname.strip():
                st.error("Username cannot be empty.")
            else:
                user = create_demo_user(uname.strip())
                st.success(f"Demo user created: {user.user_id} ({user.username})")

        users = st.session_state.users
        if users:
            user_ids = list(users.keys())
            labels = [f"{uid} | {users[uid].username}" for uid in user_ids]
            picked = st.selectbox("Select user (demo)", labels)
            chosen_uid = user_ids[labels.index(picked)]
            bal2 = st.number_input(
                "Initial Balance (demo account)", min_value=0.0, value=0.0, step=0.5
            )
            if st.button("Create Demo Account"):
                acc = create_account(chosen_uid, bal2)
                st.success(
                    f"Demo account {acc.account_id} created for {chosen_uid} "
                    f"with balance {acc.balance:.2f}"
                )

    st.divider()
    st.subheader("All Users in Memory (auth + demo)")
    if st.session_state.users:
        for u in st.session_state.users.values():
            st.write(f"- **{u.user_id}** → {u.username}")
    else:
        st.write("No users yet.")

    st.subheader("All Accounts in Memory")
    if st.session_state.accounts:
        for a in st.session_state.accounts.values():
            st.write(f"- {acc_label(a)} (user_id={a.user_id})")
    else:
        st.write("No accounts yet.")


def page_payments():
    if not require_login():
        return

    load_accounts_for_logged_in_user()

    st.header("🔁 Payments")

    processor = st.session_state.processor
    accounts = st.session_state.accounts

    if len(accounts) < 2:
        st.info("Need at least **two accounts** to make a payment.")
        return

    acc_ids = list(accounts.keys())
    labels = [acc_label(accounts[a]) for a in acc_ids]

    col1, col2 = st.columns(2)

    # -----------------------
    # LEFT: Initiate payment
    # -----------------------
    with col1:
        st.subheader("Initiate Payment")
        from_label = st.selectbox("From account", labels, key="from_acc")
        to_label = st.selectbox("To account", labels, key="to_acc")

        from_id = acc_ids[labels.index(from_label)]
        to_id = acc_ids[labels.index(to_label)]

        if from_id == to_id:
            st.warning("Sender and receiver must be different accounts.")

        amount = st.number_input(
            "Amount", min_value=0.01, value=1.0, step=0.5, key="amt_input"
        )

        st.markdown("### 🧠 Payment Method Selection")

        use_ai = st.checkbox("Let AI choose best method", value=True)

        manual_method = None
        if not use_ai:
            method_label = st.selectbox(
                "Choose method",
                [
                    "UPI",
                    "Card",
                    "Bank Transfer",
                    "NetBanking",
                    "Wallet",
                    "Crypto",
                ],
                key="manual_method",
            )
            mapping = {
                "UPI": PaymentMethod.UPI,
                "Card": PaymentMethod.CARD,
                "Bank Transfer": PaymentMethod.BANK_TRANSFER,
                "NetBanking": PaymentMethod.NETBANKING,
                "Wallet": PaymentMethod.WALLET,
                "Crypto": PaymentMethod.CRYPTO,
            }
            manual_method = mapping[method_label]

        # Show AI recommendation even if user overrides
        try:
            recommended_method = processor.choose_payment_method(
                amount=amount,
                currency="INR",
                is_domestic=True,
                need_instant=True,
                allow_crypto=True,
            )
            st.info(f"AI recommendation: **{recommended_method.value.upper()}**")
        except Exception as e:
            st.warning(f"Could not compute AI recommendation: {e}")

        status_placeholder = st.empty()

        if st.button("Initiate"):
            try:
                chosen_method = manual_method if not use_ai else None
                tx = processor.initiate_payment(
                    from_account=accounts[from_id],
                    to_account=accounts[to_id],
                    amount=amount,
                    method=chosen_method,
                    auto_pick_method=use_ai,
                )
                txid = tx.get("transaction_id", uuid.uuid4().hex[:8])
                st.session_state.transactions[txid] = tx

                # 5-second processing simulation
                for i in range(5, 0, -1):
                    status_placeholder.info(f"Processing payment... {i}s")
                    time.sleep(1)

                final_status, reason = auto_process_transaction(
                    tx, processor, accounts
                )
                st.session_state.transactions[txid] = tx  # update stored copy

                if final_status == "COMPLETED":
                    status_placeholder.success("Transaction completed ✅")
                else:
                    status_placeholder.error(
                        f"Transaction failed ❌ — {reason}"
                    )

            except Exception as e:
                st.error(f"Error initiating payment: {e}")

    # -----------------------
    # RIGHT: Confirm payment (read-only)
    # -----------------------
    with col2:
        st.subheader("Confirm / Update Payment")
        st.caption(
            "Transactions are auto-processed after 5 seconds. "
            "This panel only shows the latest status and failure reason."
        )

        if not st.session_state.transactions:
            st.write("No transactions yet.")
        else:
            tx_ids = list(st.session_state.transactions.keys())
            chosen_txid = st.selectbox("Select transaction", tx_ids)
            tx_obj = st.session_state.transactions[chosen_txid]

            st.json(tx_obj)

            if tx_obj.get("status") == "FAILED":
                st.error(f"Reason: {tx_obj.get('failure_reason', 'Unknown error')}")
            elif tx_obj.get("status") == "COMPLETED":
                st.success("This transaction is completed ✅")
            else:
                st.info("This transaction is still pending (no auto-processing run yet).")

    st.divider()
    st.subheader("Account Balances")
    for a in accounts.values():
        st.write(acc_label(a))

    st.subheader("All Transactions (debug)")
    if st.session_state.transactions:
        st.json(st.session_state.transactions)
    else:
        st.write("No transactions yet.")


def page_pay_token():
    if not require_login():
        return

    st.header("🔐 PAY_TOKEN Management")

    mgr = st.session_state.token_mgr

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Generate Token")
        uid = st.text_input("User ID", key="token_uid")
        if st.button("Generate PAY_TOKEN"):
            if not uid.strip():
                st.error("User ID required.")
            else:
                token = mgr.generate_token(uid.strip())
                st.success(f"Token: {token}")

    with col2:
        st.subheader("Validate / Revoke")
        t = st.text_input("Token", key="token_to_check")

        if st.button("Validate"):
            valid = mgr.validate_token(t.strip())
            if valid:
                st.success("Token is VALID ✅")
            else:
                st.error("Token is INVALID ❌")

        if st.button("Revoke"):
            mgr.revoke_token(t.strip())
            st.warning("Token revoked (if it existed).")

    st.divider()
    st.subheader("Debug state")
    st.write("Current token_value:", getattr(mgr, "token_value", None))


# =========================================================
#  MAIN
# =========================================================

def main():
    st.set_page_config(page_title="Unified Payment System", layout="wide")

    # Sidebar: show auth status quickly
    with st.sidebar:
        st.markdown("## 👤 User")
        if st.session_state.auth_user:
            st.write(f"**{st.session_state.auth_user['username']}**")
            if st.button("Logout", key="sidebar_logout"):
                st.session_state.auth_user = None
                st.session_state.accounts_loaded_for_user = None
                rerun()
        else:
            st.write("Not logged in")

    pages = {
        "Overview": page_overview,
        "Auth / Login": page_auth,
        "Users & Accounts": page_users_accounts,
        "Payments": page_payments,
        "PAY_TOKEN": page_pay_token,
    }

    choice = st.sidebar.radio("Navigate", list(pages.keys()))
    pages[choice]()


if __name__ == "__main__":
    main()
