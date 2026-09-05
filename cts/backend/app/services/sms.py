import os

from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client


class SmsConfigurationError(RuntimeError):
    pass


class SmsDeliveryError(RuntimeError):
    pass


def send_otp_sms(phone_number: str, otp: str, purpose: str) -> None:
    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    from_number = os.getenv("TWILIO_FROM_NUMBER", "").strip()

    if not account_sid or not auth_token or not from_number:
        raise SmsConfigurationError(
            "SMS delivery is not configured. Set TWILIO_ACCOUNT_SID, "
            "TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER."
        )

    message = f"CTS Bank: Your {purpose} OTP is {otp}. It expires in 10 minutes."
    try:
        Client(account_sid, auth_token).messages.create(
            body=message,
            from_=from_number,
            to=phone_number,
        )
    except TwilioRestException as exc:
        raise SmsDeliveryError("The OTP SMS could not be delivered") from exc
