"""
Lightweight auth helpers for the hackathon prototype.

Passwords are hashed with salted SHA-256 (no plaintext storage). Session
tokens are HMAC-signed "<user_id>.<signature>" strings — no external JWT
dependency required, but the same shape a real JWT would take, so swapping
in `python-jose` later is a drop-in change.
"""
import hashlib
import hmac
import os
import secrets

SECRET_KEY = os.environ.get("CTS_SECRET_KEY", "cts-hackathon-dev-secret-change-me")


def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(8)
    digest = hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()
    return f"{salt}${digest}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt, _ = password_hash.split("$", 1)
    except ValueError:
        return False
    return hmac.compare_digest(hash_password(password, salt), password_hash)


def create_token(user_id: str) -> str:
    sig = hmac.new(SECRET_KEY.encode(), user_id.encode(), hashlib.sha256).hexdigest()
    return f"{user_id}.{sig}"


def verify_token(token: str) -> str | None:
    try:
        user_id, sig = token.split(".", 1)
    except ValueError:
        return None
    expected = hmac.new(SECRET_KEY.encode(), user_id.encode(), hashlib.sha256).hexdigest()
    if hmac.compare_digest(sig, expected):
        return user_id
    return None
