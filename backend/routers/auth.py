from fastapi import APIRouter, HTTPException, status
import uuid
import hashlib
from datetime import datetime
from backend.schemas import UserCreate, UserLogin, UserResponse
from backend.supabase_client import get_supabase

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
    responses={404: {"description": "Not found"}},
)

def hash_password(password: str) -> str:
    # Simple hash for demo; use bcrypt/argon2 for production.
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate):
    supabase = get_supabase()
    
    # Check if user exists
    response = supabase.table("users").select("id").eq("username", user.username).execute()
    if response.data:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user_id = uuid.uuid4().hex
    pwd_hash = hash_password(user.password)
    
    data = {
        "id": user_id,
        "username": user.username,
        "password_hash": pwd_hash,
        "created_at": datetime.utcnow().isoformat()
    }
    
    try:
        supabase.table("users").insert(data).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    return UserResponse(id=user_id, username=user.username)

@router.post("/login", response_model=UserResponse)
def login(user: UserLogin):
    supabase = get_supabase()
    
    response = supabase.table("users").select("id, username, password_hash").eq("username", user.username).execute()
    if not response.data:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    row = response.data[0]
    if hash_password(user.password) != row["password_hash"]:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    return UserResponse(id=row["id"], username=row["username"])
