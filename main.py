import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine, SessionLocal
from app.models import models  # noqa: F401  (ensures models are registered on Base)
from app.services.demo_data import seed_if_empty
from app.routers import auth, profile, banks, cheques, dashboard, notifications, chat, support, security

Base.metadata.create_all(bind=engine)

app = FastAPI(title="CTS — Cheque Truncation & Verification System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(banks.router)
app.include_router(cheques.router)
app.include_router(dashboard.router)
app.include_router(notifications.router)
app.include_router(chat.router)
app.include_router(support.router)
app.include_router(security.router)


@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()


@app.get("/")
def root():
    return {"name": "CTS API", "status": "ok", "demo_login": {"email": "demo@cts.bank", "password": "cts@demo123"}}


@app.get("/health")
def health():
    return {"status": "ok"}
