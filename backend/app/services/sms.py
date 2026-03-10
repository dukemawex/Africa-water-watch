"""Africa's Talking SMS service."""
import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

AT_MESSAGING_URL = "https://api.africastalking.com/version1/messaging"


async def send_alert_sms(recipients: list[str], message: str) -> bool:
    """Send an SMS alert via Africa's Talking API."""
    formatted = f"AquaWatch Alert: {message} — Reply HELP for assistance."

    if settings.SMS_SANDBOX:
        logger.info("[SMS SANDBOX] To %s: %s", recipients, formatted)
        return True

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                AT_MESSAGING_URL,
                headers={
                    "apiKey": settings.AFRICAS_TALKING_API_KEY,
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json",
                },
                data={
                    "username": settings.AFRICAS_TALKING_USERNAME,
                    "to": ",".join(recipients),
                    "message": formatted,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            sms_data = data.get("SMSMessageData", {})
            logger.info("SMS sent: %s", sms_data.get("Message", "OK"))
            return True
    except Exception as exc:
        logger.error("SMS send failed: %s", exc)
        return False
