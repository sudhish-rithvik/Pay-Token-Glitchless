import os
import sys

# Ensure src is in path for Unified Pay modules
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(BASE_DIR, "src")
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)
if SRC_DIR not in sys.path:
    sys.path.append(SRC_DIR)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import auth, accounts, payments, payees

app = FastAPI(title="Unified Payment Orchestrator API")

# CORS
origins = [
    "http://localhost:3000",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(payments.router)
app.include_router(payees.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Unified Pay API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
