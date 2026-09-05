"""
Database configuration.

Uses SQLite for the hackathon prototype. The engine URL is the only thing
that needs to change to move to PostgreSQL later, e.g.:

    DATABASE_URL = "postgresql+psycopg2://user:pass@host:5432/cts"

All models use SQLAlchemy's declarative ORM, which is portable across both
backends without further changes.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./cts.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
