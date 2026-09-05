import datetime
import uuid
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from app.database import Base


def gen_id(prefix: str = ""):
    return f"{prefix}{uuid.uuid4().hex[:12]}"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: gen_id("usr_"))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    phone = Column(String, default="")
    phone_verified = Column(Boolean, default=False)
    phone_otp = Column(String, default="")
    phone_otp_expires_at = Column(DateTime, nullable=True)
    password_hash = Column(String, nullable=False)
    date_of_birth = Column(String, default="")
    address = Column(String, default="")
    city = Column(String, default="")
    state = Column(String, default="")
    pincode = Column(String, default="")
    last_known_city = Column(String, default="")  # used for the location-security signal
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    bank_accounts = relationship("BankAccount", back_populates="user", cascade="all, delete-orphan")
    signatures = relationship("Signature", back_populates="user", cascade="all, delete-orphan")
    cheques = relationship("Cheque", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    tickets = relationship("SupportTicket", back_populates="user", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")


class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id = Column(String, primary_key=True, default=lambda: gen_id("bnk_"))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    bank_name = Column(String, nullable=False)
    account_number = Column(String, nullable=False)
    ifsc = Column(String, nullable=False)
    account_type = Column(String, default="Savings")
    is_default = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="bank_accounts")


class Signature(Base):
    __tablename__ = "signatures"

    id = Column(String, primary_key=True, default=lambda: gen_id("sig_"))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    image_path = Column(String, nullable=False)
    quality_score = Column(Float, default=0)
    clarity_score = Column(Float, default=0)
    stroke_score = Column(Float, default=0)
    contrast_score = Column(Float, default=0)
    background_score = Column(Float, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="signatures")


class Cheque(Base):
    __tablename__ = "cheques"

    id = Column(String, primary_key=True, default=lambda: gen_id())
    display_id = Column(String, unique=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    bank_account_id = Column(String, ForeignKey("bank_accounts.id"), nullable=False)
    image_path = Column(String, default="")
    amount_numeric = Column(Float, default=0)
    amount_words = Column(String, default="")
    payee = Column(String, default="")
    micr = Column(String, default="")
    cheque_date = Column(String, default="")
    status = Column(String, default="processing")  # processing | accepted | rejected | manual_review
    rejection_reason = Column(String, default="")
    rejection_message = Column(Text, default="")
    rejection_attempts = Column(Integer, default=0)
    otp_code = Column(String, default="")
    otp_expires_at = Column(DateTime, nullable=True)
    otp_verified = Column(Boolean, default=False)
    verification_score = Column(Float, default=0)
    demo_scenario = Column(String, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="cheques")
    bank_account = relationship("BankAccount")
    verification_result = relationship("VerificationResult", back_populates="cheque", uselist=False, cascade="all, delete-orphan")


class VerificationResult(Base):
    __tablename__ = "verification_results"

    id = Column(String, primary_key=True, default=lambda: gen_id("ver_"))
    cheque_id = Column(String, ForeignKey("cheques.id"), nullable=False)
    image_quality = Column(Float, default=0)
    signature_score = Column(Float, default=0)
    amount_match = Column(Boolean, default=True)
    date_valid = Column(Boolean, default=True)
    micr_score = Column(Float, default=0)
    risk_score = Column(Float, default=0)
    decision = Column(String, default="accepted")
    checklist_json = Column(Text, default="{}")
    timeline_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    cheque = relationship("Cheque", back_populates="verification_result")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=lambda: gen_id("ntf_"))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    type = Column(String, default="info")  # success | warning | security | support | info
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    read = Column(Boolean, default=False)
    related_cheque_id = Column(String, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(String, primary_key=True, default=lambda: gen_id("tkt_"))
    display_id = Column(String, unique=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    cheque_id = Column(String, default="")
    reason = Column(String, default="")
    priority = Column(String, default="Normal")
    status = Column(String, default="waiting_for_agent")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="tickets")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=lambda: gen_id("msg_"))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    role = Column(String, default="user")  # user | assistant
    content = Column(Text, default="")
    related_cheque_id = Column(String, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="chat_messages")
