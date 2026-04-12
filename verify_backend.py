import requests
import sys
import random

BASE_URL = "http://localhost:8000"

def generate_acc_data():
    return {
        "account_number": str(random.randint(1000000000000000, 9999999999999999)),
        "cvv": str(random.randint(100, 999)),
        "expiry_date": "12/30"
    }

def test_flow():
    print("1. Registering User...")
    user_data = {"username": "test_user_supa", "password": "password123"}
    resp = requests.post(f"{BASE_URL}/auth/register", json=user_data)
    if resp.status_code == 200:
        print("   Success:", resp.json())
        user_id = resp.json()["id"]
    elif resp.status_code == 400 and "already exists" in resp.text:
        print("   User already exists, logging in...")
        resp = requests.post(f"{BASE_URL}/auth/login", json=user_data)
        user_id = resp.json()["id"]
    else:
        print("   Failed:", resp.text)
        sys.exit(1)

    print("\n2. Creating Accounts (with Supabase fields)...")
    # Account 1
    acc1_data = {
        "user_id": user_id, 
        "balance": 5000.0,
        **generate_acc_data()
    }
    acc1_resp = requests.post(f"{BASE_URL}/accounts/", json=acc1_data)
    if acc1_resp.status_code == 200:
        acc1 = acc1_resp.json()
        print(f"   Created Account 1: {acc1['id']} (AccNo: {acc1['account_number']})")
    else:
        print("   Failed to create account 1:", acc1_resp.text)
        sys.exit(1)
        
    # Account 2
    acc2_data = {
        "user_id": user_id, 
        "balance": 1000.0,
        **generate_acc_data()
    }
    acc2_resp = requests.post(f"{BASE_URL}/accounts/", json=acc2_data)
    if acc2_resp.status_code == 200:
        acc2 = acc2_resp.json()
        print(f"   Created Account 2: {acc2['id']} (AccNo: {acc2['account_number']})")
    else:
        print("   Failed to create account 2:", acc2_resp.text)
        sys.exit(1)

    print("\n3. Looking up Account 2 by Number...")
    lookup_resp = requests.get(f"{BASE_URL}/accounts/lookup/{acc2['account_number']}")
    if lookup_resp.status_code == 200:
        found_acc = lookup_resp.json()
        print(f"   Lookup Success: Found {found_acc['id']}")
    elif lookup_resp.status_code == 501:
        print("   Skipping lookup test (Supabase not configured)")
    else:
        print("   Lookup Failed:", lookup_resp.text)

    print("\n4. Initiating Payment (Acc1 -> Acc2) using IDs...")
    payment_data = {
        "from_account_id": acc1["id"],
        "to_account_id": acc2["id"],
        "amount": 500.0,
        "currency": "INR",
        "auto_pick_method": True,
        "need_instant": False,
        "speed_mode": "Standard"
    }
    pay_resp = requests.post(f"{BASE_URL}/payments/initiate", json=payment_data)
    if pay_resp.status_code == 200:
        tx = pay_resp.json()
        print("   Payment Initiated:", tx)
    else:
        print("   Payment Initiation Failed:", pay_resp.text)
        sys.exit(1)

    print("\n5. Confirming Payment...")
    confirm_resp = requests.post(f"{BASE_URL}/payments/confirm", json={"transaction_id": tx["transaction_id"]})
    if confirm_resp.status_code == 200:
        result = confirm_resp.json()
        print("   Payment Confirmed:", result)
        if result["status"] == "COMPLETED":
            print("   ✅ Transaction Successful")
        else:
            print("   ❌ Transaction Failed")
    else:
        print("   Confirmation Failed:", confirm_resp.text)
        sys.exit(1)

    print("\n6. Deleting Account 1...")
    del_resp = requests.delete(f"{BASE_URL}/accounts/{acc1['id']}")
    if del_resp.status_code == 200:
        print("   ✅ Account 1 Deleted Successfully")
    else:
        print("   ❌ Failed to delete account:", del_resp.text)

if __name__ == "__main__":
    try:
        test_flow()
    except Exception as e:
        print(f"\n❌ Test Script Error: {e}")
        sys.exit(1)
