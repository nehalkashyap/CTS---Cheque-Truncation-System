import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field


# ---------- Auth ----------

class LoginRequest(BaseModel):
    email: str
    password: str
    remember_me: bool = False


class LoginResponse(BaseModel):
    token: str
    user: "UserOut"


class ForgotPasswordRequest(BaseModel):
    email: str


# ---------- User / Profile ----------

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    phone_verified: bool = False
    date_of_birth: str
    address: str
    city: str
    state: str
    pincode: str

    class Config:
        from_attributes = True


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None


# ---------- Bank Accounts ----------

class BankAccountCreate(BaseModel):
    bank_name: str
    account_number: str
    ifsc: str
    account_type: str = "Savings"
    is_default: bool = False


class BankAccountOut(BaseModel):
    id: str
    bank_name: str
    account_number: str
    ifsc: str
    account_type: str
    is_default: bool
    is_verified: bool
    masked_account_number: str

    class Config:
        from_attributes = True


# ---------- Signature ----------

class SignatureOut(BaseModel):
    id: str
    image_path: str
    quality_score: float
    clarity_score: float
    stroke_score: float
    contrast_score: float
    background_score: float
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class SignatureAnalyzeResponse(BaseModel):
    quality_score: float
    clarity_score: float
    stroke_score: float
    contrast_score: float
    background_score: float
    verdict: str
    suggestions: List[str] = []


# ---------- Cheques ----------

class ChequeCreate(BaseModel):
    bank_account_id: str
    amount_numeric: float
    amount_words: str = ""
    payee: str = ""
    cheque_date: str = ""
    demo_scenario: Optional[str] = None  # for the demo-mode selector


class ChequeOut(BaseModel):
    id: str
    display_id: str
    bank_account_id: str
    bank_name: str
    amount_numeric: float
    amount_words: str
    payee: str
    micr: str
    cheque_date: str
    status: str
    rejection_reason: str
    rejection_message: str
    verification_score: float
    created_at: datetime.datetime
    processed_at: Optional[datetime.datetime]

    class Config:
        from_attributes = True


class VerificationChecklistItem(BaseModel):
    label: str
    passed: bool
    score: Optional[float] = None


class VerificationResultOut(BaseModel):
    decision: str
    reason: str
    message: str
    confidence: float
    checks: Dict[str, Any]
    timeline: List[Dict[str, Any]]


# ---------- Notifications ----------

class NotificationOut(BaseModel):
    id: str
    type: str
    title: str
    message: str
    read: bool
    related_cheque_id: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# ---------- Chat ----------

class ChatMessageCreate(BaseModel):
    content: str
    related_cheque_id: Optional[str] = None


class ChatMessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime.datetime
    quick_actions: List[str] = []

    class Config:
        from_attributes = True


# ---------- Support ----------

class SupportTicketCreate(BaseModel):
    cheque_id: Optional[str] = None
    reason: str


class SupportTicketOut(BaseModel):
    id: str
    display_id: str
    cheque_id: str
    reason: str
    priority: str
    status: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


# ---------- Security ----------

class LocationVerificationRequest(BaseModel):
    city: str


class CaptchaVerifyRequest(BaseModel):
    code: str
    expected: str


# ---------- Dashboard ----------

class DashboardStats(BaseModel):
    total_deposited: int
    total_deposited_change_pct: float
    processing: int
    accepted: int
    rejected: int
    activity: List[Dict[str, Any]]
    recent_cheques: List[ChequeOut]
