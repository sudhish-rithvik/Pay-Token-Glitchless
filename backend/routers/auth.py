from fastapi import APIRouter, HTTPException, status
import uuid
import hashlib
from backend.schemas import UserCreate, UserLogin, UserResponse
from backend.db import get_db

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
    responses={404: {"description": "Not found"}},
)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate):
    with get_db() as conn:
        # Check if user exists
        row = conn.execute(
            "SELECT id FROM users WHERE username = ?", (user.username,)
        ).fetchone()
        if row:
            raise HTTPException(status_code=400, detail="Username already exists")

        user_id = uuid.uuid4().hex
        conn.execute(
            "INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)",
            (user_id, user.username, hash_password(user.password))
        )

    return UserResponse(id=user_id, username=user.username)


@router.post("/login", response_model=UserResponse)
def login(user: UserLogin):
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, username, password_hash FROM users WHERE username = ?",
            (user.username,)
        ).fetchone()

    if not row:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if hash_password(user.password) != row["password_hash"]:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return UserResponse(id=row["id"], username=row["username"])
