# CTS — Cheque Truncation & Verification System

An AI-powered cheque deposit, verification, risk-management, and customer-assistance platform.
Built for the Razorpay Hackathon.

> Cheque processing, made transparent.

---

## What's in here

```
cts/
├── backend/     FastAPI + SQLAlchemy + SQLite REST API
└── frontend/    React + Vite + TypeScript + Tailwind UI
```

---

## Quick start

### 1. Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate   # optional but recommended
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API runs at **http://localhost:8000**. A demo user and 12 months of cheque
history are seeded automatically on first startup — no manual setup required.
Interactive API docs are available at `http://localhost:8000/docs`.

**Demo credentials**

```
Email:    demo@cts.bank
Password: cts@demo123
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at **http://localhost:5173** and proxies `/api` and `/uploads`
requests to the backend (see `vite.config.ts`), so both servers need to be
running side by side.

---

## Environment variables

| Location | Variable | Default | Purpose |
|---|---|---|---|
| `backend` | `DATABASE_URL` | `sqlite:///./cts.db` | Swap for a `postgresql+psycopg2://...` URL to move to Postgres — no model changes needed. |
| `backend` | `CTS_SECRET_KEY` | dev placeholder | HMAC key signing session tokens. Set a real secret in production. |
| `backend` | `TWILIO_ACCOUNT_SID` | unset | Twilio account SID used for OTP SMS. |
| `backend` | `TWILIO_AUTH_TOKEN` | unset | Twilio authentication token used for OTP SMS. |
| `backend` | `TWILIO_FROM_NUMBER` | unset | Twilio phone number in E.164 format, such as `+15551234567`. |
| `frontend` | `VITE_API_URL` | `/api` | Base path the frontend calls; change if you serve the API from a different origin. |

---

## Architecture

### Verification pipeline (the important part)

```
Cheque Image
      │
Image Processing        (production: YOLO field localization)
      │
ML / Verification Models
   • handwritten amount reconstruction (production: TrOCR)
   • signature similarity              (production: Siamese network)
   • MICR extraction
   • date validation
      │
Rules Engine             ← the ONLY component that decides accept/reject/review
      │
Verification Decision → Database → Notifications → AI Assistant (explains, never decides)
```

`app/services/risk_engine.py` is intentionally the single source of truth for
cheque outcomes. The chatbot (`app/services/chatbot.py`) only ever reads a
persisted `VerificationResult` and explains it in plain language — it cannot
independently accept, reject, or escalate a cheque. This separation is
enforced at the module level, not just by convention.

For the hackathon prototype, the ML stages (image quality, signature
similarity, MICR confidence) are simulated with seeded randomness via
`app/services/cheque_verification.py`, with a **Demo Mode** scenario picker
so every rejection path can be reliably demonstrated live:

- Successful cheque
- Signature mismatch
- Amount mismatch
- Stale cheque
- Unreadable MICR
- Bank error
- Manual review

The module boundaries match where real models would plug in later.

### Signature quality analysis

`app/services/signature_analysis.py` derives clarity / stroke / contrast /
background scores from real image statistics (via Pillow) rather than
hardcoded numbers, so the enrollment flow behaves sensibly on real uploads
even before a trained quality model is wired in.

### Auth

Lightweight HMAC-signed bearer tokens (`app/utils/security.py`) — no external
JWT dependency, but the same shape, so swapping in `python-jose` later is a
drop-in change. Passwords are salted-SHA256 hashed, never stored in plaintext.

---

## API overview

```
POST   /auth/login
POST   /auth/forgot-password

GET    /dashboard

GET    /banks
POST   /banks
DELETE /banks/{id}
PUT    /banks/{id}/default

GET    /profile
PUT    /profile
GET    /profile/signature
POST   /profile/signature
POST   /profile/signature/analyze

POST   /cheques
GET    /cheques
GET    /cheques/{id}
GET    /cheques/{id}/timeline
POST   /cheques/{id}/verify

GET    /notifications
PUT    /notifications/{id}/read
PUT    /notifications/read-all

POST   /chat/messages
GET    /chat/messages

POST   /support/tickets
GET    /support/tickets

POST   /security/location-verification
GET    /security/captcha
POST   /security/captcha
```

Full interactive docs (with request/response schemas) are at `/docs` once the
backend is running.

---

## Demo script (≈30 seconds)

1. Log in with the demo credentials.
2. View the dashboard — stats, activity chart, recent cheques.
3. Go to **Bank Accounts** — see the pre-added accounts, or add a new one.
4. Go to **Profile** — enroll a signature (upload or draw), see the quality
   analysis.
5. Go to **Add Cheque** — upload an image, fill in details, optionally open
   **Demo Verification** to pick a scenario, then click **Verify Cheque**.
6. Watch the animated verification pipeline, then see the accept/reject/
   manual-review receipt with a full checks breakdown.
7. Check the notification bell for the new alert.
8. Open **AI Assistant**, ask "Why was my cheque rejected?", then try
   "I want to speak to a person" to see the human-escalation handoff and
   ticket creation.
9. View the cheque again from **Evaluated** to see its full timeline.

---

## Notes on the prototype

- SQLite is used for zero-setup local development; the ORM layer is written
  so PostgreSQL is a one-line `DATABASE_URL` change.
- Uploaded cheque images and signatures are stored under `backend/uploads/`
  and served statically at `/uploads/...`.
- This is a hackathon prototype: ML stages are simulated, not trained models.
  Every simulated boundary is called out in code comments so a real model
  can be dropped in without touching the surrounding architecture.
