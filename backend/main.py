import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

print("Starting: importing modules...", flush=True)

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import create_db_and_tables
from routers import chat, documents, modules

_BACKEND_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _BACKEND_DIR.parent
# README documents .env at repo root; also support backend/.env (backend-specific overrides).
load_dotenv(_REPO_ROOT / ".env")
load_dotenv(_BACKEND_DIR / ".env", override=True)

logging.basicConfig(level=logging.INFO, stream=sys.stdout)
logger = logging.getLogger(__name__)

print("Modules imported OK.", flush=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up — creating DB tables...")
    create_db_and_tables()
    logger.info("Startup complete.")
    yield


app = FastAPI(title="KT Knowledge Base API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(modules.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(chat.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
