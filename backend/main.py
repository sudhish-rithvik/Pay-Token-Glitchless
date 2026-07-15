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
from contextlib import asynccontextmanager
from backend.routers import auth, accounts, payments, payees
from backend.db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialise local SQLite DB and seed sample data on every startup
    init_db()
    yield


app = FastAPI(title="TokenOne Payment Orchestrator API", lifespan=lifespan)

# CORS
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
    return {"message": "TokenOne API — local SQLite mode"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
