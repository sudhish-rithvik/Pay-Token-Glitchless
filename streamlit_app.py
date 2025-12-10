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
        fx_mod = importlib.import_module("unified_pay.services.fx_service")
    except ModuleNotFoundError as e:
        st.error(f"❌ Could not import unified_pay: {e}")
        st.stop()

    return (
        user_mod.User,
        account_mod.Account,
        pp_mod.PaymentProcessor,
        token_mod.PAY_TOKEN,
        pm_mod.PaymentMethod,
        fx_mod.FXService,
    )


# Initialise DB before anything else
init_auth_db()
User, Account, PaymentProcessor, PAY_TOKEN, PaymentMethod, FXService = load_unified_pay()


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
    if "fx_service" not in st.session_state:
        st.session_state.fx_service = FXService()


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
    amount_in_inr = tx["amount"]  # internal amount is always INR

    reasons = []

    if from_acc is None or to_acc is None:
        reasons.append("One of the accounts no longer exists.")

    if from_acc is not None and from_acc.balance < amount_in_inr:
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
        # SUCCESS: update balances (in INR)
        if from_acc is not None and to_acc is not None:
            from_acc.balance -= amount_in_inr
            to_acc.balance += amount_in_inr
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
        - ⚡ Speed-aware routing (Standard / Priority / Express)  
        - 🌐 Per-payment FX & Crypto conversion inside Payments  
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
            "Initial Balance for new account (INR)", min_value=0.0, value=0.0, step=0.5
        )
        if st.button("Create My Account"):
            acc = create_account(auth_user["id"], bal)
            st.success(
                f"Account {acc.account_id} created for {auth_user['username']} "
                f"with balance {acc.balance:.2f} INR"
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
                "Initial Balance (demo account, INR)", min_value=0.0, value=0.0, step=0.5
            )
            if st.button("Create Demo Account"):
                acc = create_account(chosen_uid, bal2)
                st.success(
                    f"Demo account {acc.account_id} created for {chosen_uid} "
                    f"with balance {acc.balance:.2f} INR"
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
    fx: FXService = st.session_state.fx_service

    if len(accounts) < 2:
        st.info("Need at least **two accounts** to make a payment.")
        return

    acc_ids = list(accounts.keys())
    labels = [acc_label(accounts[a]) for a in acc_ids]

    col1, col2 = st.columns(2)

    # -----------------------
    # LEFT: Initiate payment (with FX + speed + AI routing)
    # -----------------------
    with col1:
        st.subheader("Initiate Payment")

        from_label = st.selectbox("From account", labels, key="from_acc")
        to_label = st.selectbox("To account", labels, key="to_acc")

        from_id = acc_ids[labels.index(from_label)]
        to_id = acc_ids[labels.index(to_label)]

        if from_id == to_id:
            st.warning("Sender and receiver must be different accounts.")

        # -------- CURRENCY SELECTION --------
        symbols = fx.get_popular_symbols()
        crypto_symbols = ["BTC", "ETH", "USDT", "SOL", "BNB"]

        cc1, cc2 = st.columns(2)
        with cc1:
            from_ccy = st.selectbox("From currency", symbols, index=symbols.index("INR"))
        with cc2:
            # default to same as from_ccy (INR→INR) to make UPI possible
            default_to_index = symbols.index("INR") if "INR" in symbols else 0
            to_ccy = st.selectbox("To currency", symbols, index=default_to_index)

        # Amount is expressed in from_ccy
        amount_from = st.number_input(
            f"Amount ({from_ccy})",
            min_value=0.01,
            value=1.0,
            step=0.5,
            key="amt_input",
        )

        converted_amount = None
        fx_rate = None
        if amount_from > 0:
            try:
                fx_rate = fx.get_rate(from_ccy, to_ccy)
                converted_amount = fx_rate * amount_from
                st.caption(
                    f"{amount_from:.4f} {from_ccy} ≈ {converted_amount:.4f} {to_ccy}  \n"
                    f"1 {from_ccy} ≈ {fx_rate:.6f} {to_ccy}"
                )
            except Exception as e:
                st.warning(f"FX preview unavailable: {e}")

        # -------- SPEED SELECTION --------
        st.markdown("### ⚡ Transaction Speed")
        speed_mode = st.selectbox(
            "Choose processing speed",
            ["Standard", "Priority", "Express"],
        )

        # Map speed → AI flags
        if speed_mode == "Standard":
            need_instant = False
            force_crypto = False
        elif speed_mode == "Priority":
            need_instant = True
            force_crypto = False
        else:  # Express
            need_instant = True
            force_crypto = True  # prefer crypto for high amounts

        # -------- AI / Manual method selection --------
        st.markdown("### 🧠 Payment Method Selection")

        # UPI allowed only for INR→INR
        is_inr_to_inr = (from_ccy == "INR" and to_ccy == "INR")

        base_methods = [
            "UPI",
            "Card",
            "Bank Transfer",
            "NetBanking",
            "Wallet",
            "Crypto",
        ]
        allowed_methods = []
        for m in base_methods:
            if m == "UPI" and not is_inr_to_inr:
                continue
            allowed_methods.append(m)

        use_ai = st.checkbox("Let AI choose best method", value=True)

        manual_method = None
        manual_method_label = None
        if not use_ai:
            manual_method_label = st.selectbox(
                "Choose method",
                allowed_methods,
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
            manual_method = mapping[manual_method_label]

        # -------- AI RECOMMENDATION --------
        crypto_asset_for_display = None
        try:
            # High-value Express → strong crypto preference
            # Internal decisions based on INR equivalent
            amount_in_inr_preview = amount_from
            if from_ccy != "INR":
                try:
                    amount_in_inr_preview = fx.convert(amount_from, from_ccy, "INR")
                except Exception:
                    pass

            if amount_in_inr_preview >= 100_000 and speed_mode == "Express":
                recommended_method = PaymentMethod.CRYPTO
                st.info(
                    "High-value + Express detected → "
                    "**CRYPTO preferred for fastest settlement** ✅"
                )
            else:
                recommended_method = processor.choose_payment_method(
                    amount=amount_in_inr_preview,
                    currency=from_ccy,
                    is_domestic=True,
                    need_instant=need_instant,
                    allow_crypto=True,
                )

            # Enforce UPI restriction: only INR→INR
            if recommended_method == PaymentMethod.UPI and not is_inr_to_inr:
                st.warning(
                    "UPI is only allowed for INR → INR. "
                    "Falling back to CARD for this scenario."
                )
                recommended_method = PaymentMethod.CARD

            st.info(
                f"AI recommendation: **{recommended_method.value.upper()}**  \n"
                f"Speed mode: **{speed_mode}**  \n"
                f"Route: {from_ccy} → {to_ccy}"
            )

        except Exception as e:
            st.warning(f"Could not compute AI recommendation: {e}")
            recommended_method = None

        # -------- Crypto extra UI (if crypto rail is active) --------
        crypto_asset = None
        crypto_rate_to_to = None

        crypto_is_active = (
            (manual_method == PaymentMethod.CRYPTO)
            or (use_ai and recommended_method == PaymentMethod.CRYPTO)
        )

        if crypto_is_active:
            st.markdown("### 🪙 Crypto Details")
            crypto_asset = st.selectbox(
                "Crypto asset",
                crypto_symbols,
                key="crypto_asset_select",
            )
            try:
                crypto_rate_to_to = fx.get_rate(crypto_asset, to_ccy)
                st.caption(
                    f"1 {crypto_asset} ≈ {crypto_rate_to_to:.6f} {to_ccy}"
                )
            except Exception as e:
                st.warning(f"Crypto price lookup failed: {e}")

        status_placeholder = st.empty()

        # -------- INITIATE PAYMENT --------
        if st.button("Initiate"):
            try:
                # Compute internal amount in INR for ledger
                try:
                    if from_ccy == "INR":
                        amount_in_inr = amount_from
                    else:
                        amount_in_inr = fx.convert(amount_from, from_ccy, "INR")
                except Exception as e:
                    st.error(f"FX conversion failed; cannot initiate payment: {e}")
                    return

                chosen_method = manual_method if not use_ai else None

                # Override: very high Express → crypto rail
                if amount_in_inr >= 100_000 and speed_mode == "Express":
                    chosen_method = PaymentMethod.CRYPTO

                tx = processor.initiate_payment(
                    from_account=accounts[from_id],
                    to_account=accounts[to_id],
                    amount=amount_in_inr,  # internal INR amount
                    method=chosen_method,
                    auto_pick_method=use_ai,
                    need_instant=need_instant,
                )

                # Store FX + display metadata
                tx["speed_mode"] = speed_mode
                tx["from_currency"] = from_ccy
                tx["to_currency"] = to_ccy
                tx["amount_from"] = amount_from
                if converted_amount is not None:
                    tx["amount_to"] = converted_amount
                    tx["fx_rate"] = fx_rate
                if crypto_is_active and crypto_asset:
                    tx["crypto_asset"] = crypto_asset
                    if crypto_rate_to_to is not None:
                        tx["crypto_rate_to_to_ccy"] = crypto_rate_to_to

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
                    status_placeholder.success(
                        f"Transaction completed ✅ | Speed: {speed_mode} | "
                        f"Method: {tx.get('method', 'unknown')} | "
                        f"{amount_from:.2f} {from_ccy} → "
                        f"{tx.get('amount_to', converted_amount):.2f if tx.get('amount_to', None) else amount_from:.2f} {to_ccy}"
                    )
                else:
                    status_placeholder.error(
                        f"Transaction failed ❌ | Reason: {reason} | "
                        f"Speed: {speed_mode}"
                    )

            except Exception as e:
                st.error(f"Error initiating payment: {e}")

    # -----------------------
    # RIGHT: Transaction Status (pretty summary, no raw JSON)
    # -----------------------
    with col2:
        st.subheader("Transaction Status")
        st.caption(
            "Transactions are auto-processed after 5 seconds. "
            "Select a transaction to view its final status."
        )

        if not st.session_state.transactions:
            st.info("No transactions yet.")
        else:
            tx_ids = list(st.session_state.transactions.keys())
            chosen_txid = st.selectbox("Select transaction", tx_ids)
            tx_obj = st.session_state.transactions[chosen_txid]

            from_ccy = tx_obj.get("from_currency", "INR")
            to_ccy = tx_obj.get("to_currency", "INR")
            amount_from = tx_obj.get("amount_from", tx_obj.get("amount", 0.0))
            amount_to = tx_obj.get("amount_to", None)
            amount_in_inr = tx_obj.get("amount", 0.0)

            st.markdown("### ✅ Transaction Summary")

            summary_lines = [
                f"**Transaction ID:** `{tx_obj.get('transaction_id', 'N/A')}`",
                f"**From Account:** `{tx_obj.get('from_account_id', 'N/A')}`",
                f"**To Account:** `{tx_obj.get('to_account_id', 'N/A')}`",
                f"**From Amount:** {amount_from:.2f} {from_ccy}",
            ]

            if amount_to is not None:
                summary_lines.append(
                    f"**To Amount (FX):** {amount_to:.2f} {to_ccy}"
                )
            else:
                summary_lines.append(
                    f"**To Currency:** {to_ccy}"
                )

            summary_lines.append(
                f"**Internal Ledger Amount:** {amount_in_inr:.2f} INR"
            )
            summary_lines.append(
                f"**Method:** **{tx_obj.get('method', 'N/A').upper()}**"
            )
            summary_lines.append(
                f"**Speed Mode:** **{tx_obj.get('speed_mode', 'N/A')}**"
            )
            summary_lines.append(
                f"**Status:** **{tx_obj.get('status', 'PENDING')}**"
            )

            if "crypto_asset" in tx_obj:
                summary_lines.append(
                    f"**Crypto Rail:** {tx_obj['crypto_asset']}"
                )

            st.markdown("\n\n".join(summary_lines))

            if tx_obj.get("status") == "FAILED":
                st.error(
                    f"❌ Reason for Failure: {tx_obj.get('failure_reason', 'Unknown error')}"
                )
            elif tx_obj.get("status") == "COMPLETED":
                st.success("✅ Transaction completed successfully!")
            else:
                st.info("⏳ Transaction is still processing…")

    st.divider()
    st.subheader("Account Balances (INR)")
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
