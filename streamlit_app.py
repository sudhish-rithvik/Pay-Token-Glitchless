import os
import sys
import uuid
import importlib

import streamlit as st


# -----------------------
# DYNAMIC IMPORT HELPER
# -----------------------
def load_unified_pay():
    """
    Make sure src/ is on sys.path and then import unified_pay modules.
    Shows a nice error in the UI if something is wrong.
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))  # unified-payment-system/
    src_dir = os.path.join(base_dir, "src")                # unified-payment-system/src

    if src_dir not in sys.path:
        sys.path.insert(0, src_dir)

    st.sidebar.write("🔍 Debug")
    st.sidebar.write("BASE_DIR:", base_dir)
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


User, Account, PaymentProcessor, PAY_TOKEN, PaymentMethod = load_unified_pay()


# -----------------------
# SESSION STATE INIT
# -----------------------
def init_state():
    if "users" not in st.session_state:
        st.session_state.users = {}       # user_id -> User
    if "accounts" not in st.session_state:
        st.session_state.accounts = {}    # acc_id -> Account
    if "processor" not in st.session_state:
        st.session_state.processor = PaymentProcessor()
    if "token_mgr" not in st.session_state:
        st.session_state.token_mgr = PAY_TOKEN()
    if "transactions" not in st.session_state:
        st.session_state.transactions = {}  # txid -> tx_dict


init_state()


def create_user(username: str) -> User:
    uid = uuid.uuid4().hex[:8]
    user = User(user_id=uid, username=username)
    st.session_state.users[uid] = user
    return user


def create_account(user_id: str, balance: float) -> Account:
    aid = uuid.uuid4().hex[:8]
    acc = Account(account_id=aid, user_id=user_id, balance=balance)
    st.session_state.accounts[aid] = acc
    return acc


def acc_label(acc: Account) -> str:
    user = st.session_state.users.get(acc.user_id)
    uname = user.username if user else "Unknown"
    return f"{acc.account_id} | {uname} | Balance: {acc.balance:.2f}"


# -----------------------
# PAGES
# -----------------------
def page_overview():
    st.title("💸 Unified Payment System – PAY_TOKEN Demo")
    st.markdown(
        """
        This Streamlit app sits on top of your **`unified_pay`** package and lets you:

        - Create users & accounts  
        - Simulate payments using `PaymentProcessor` with AI-based method routing  
        - Issue / validate PAY_TOKEN  
        """
    )


def page_users_accounts():
    st.header("👤 Users & Accounts")

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Create User")
        uname = st.text_input("Username", key="uname_input")
        if st.button("Add User"):
            if not uname.strip():
                st.error("Username cannot be empty.")
            else:
                user = create_user(uname.strip())
                st.success(f"User created: {user.user_id} ({user.username})")

    with col2:
        st.subheader("Create Account")
        users = st.session_state.users
        if not users:
            st.info("Create a user first.")
        else:
            user_ids = list(users.keys())
            labels = [f"{uid} | {users[uid].username}" for uid in user_ids]
            picked = st.selectbox("Select user", labels)
            chosen_uid = user_ids[labels.index(picked)]
            bal = st.number_input(
                "Initial Balance", min_value=0.0, value=0.0, step=0.5
            )
            if st.button("Create Account"):
                acc = create_account(chosen_uid, bal)
                st.success(
                    f"Account {acc.account_id} created for {chosen_uid} with {acc.balance:.2f}"
                )

    st.divider()
    st.subheader("Existing Users")
    if st.session_state.users:
        for u in st.session_state.users.values():
            st.write(f"- **{u.user_id}** → {u.username}")
    else:
        st.write("No users yet.")

    st.subheader("Existing Accounts")
    if st.session_state.accounts:
        for a in st.session_state.accounts.values():
            st.write(f"- {acc_label(a)} (user_id={a.user_id})")
    else:
        st.write("No accounts yet.")


def page_payments():
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
                # tx is a dict from the new PaymentProcessor
                txid = tx.get("transaction_id", uuid.uuid4().hex[:8])
                st.session_state.transactions[txid] = tx
                st.success(
                    f"Transaction created: {txid} "
                    f"(method = {tx.get('method', 'unknown')})"
                )
            except Exception as e:
                st.error(f"Error initiating payment: {e}")

    # -----------------------
    # RIGHT: Confirm payment
    # -----------------------
    with col2:
        st.subheader("Confirm / Update Payment")
        if not st.session_state.transactions:
            st.write("No pending or existing transactions.")
        else:
            tx_ids = list(st.session_state.transactions.keys())
            chosen_txid = st.selectbox("Select transaction", tx_ids)
            tx_obj = st.session_state.transactions[chosen_txid]

            # tx_obj is a dict, show nicely
            st.json(tx_obj)

            col_ok, col_fail = st.columns(2)
            with col_ok:
                if st.button("Mark COMPLETED"):
                    try:
                        ok = processor.confirm_payment(tx_obj, mark_failed=False)
                        if ok:
                            tx_obj["status"] = "COMPLETED"
                            st.session_state.transactions[chosen_txid] = tx_obj
                            st.success("Transaction confirmed ✅")
                        else:
                            st.error("Failed to confirm transaction.")
                    except Exception as e:
                        st.error(f"Error confirming payment: {e}")
            with col_fail:
                if st.button("Mark FAILED"):
                    try:
                        ok = processor.confirm_payment(tx_obj, mark_failed=True)
                        if ok:
                            tx_obj["status"] = "FAILED"
                            st.session_state.transactions[chosen_txid] = tx_obj
                            st.warning("Transaction marked as FAILED.")
                        else:
                            st.error("Failed to update transaction.")
                    except Exception as e:
                        st.error(f"Error updating transaction: {e}")

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


# -----------------------
# MAIN
# -----------------------
def main():
    st.set_page_config(page_title="Unified Payment System", layout="wide")

    pages = {
        "Overview": page_overview,
        "Users & Accounts": page_users_accounts,
        "Payments": page_payments,
        "PAY_TOKEN": page_pay_token,
    }

    choice = st.sidebar.radio("Navigate", list(pages.keys()))
    pages[choice]()


if __name__ == "__main__":
    main()
