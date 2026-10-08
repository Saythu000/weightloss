"""
FastAPI WhatsApp Webhook & Message Router
Handles incoming WhatsApp messages and triggers automated interactive replies.
"""

from fastapi import APIRouter, Request, Form, Response
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger("Trekatour.API.WhatsAppRouter")
router = APIRouter(prefix="/whatsapp", tags=["WhatsApp Outreach"])


@router.post("/webhook")
async def handle_whatsapp_webhook(
    From: str = Form(""),
    Body: str = Form(""),
    ProfileName: Optional[str] = Form("Traveler"),
):
    """
    Receives incoming WhatsApp message payload from Twilio.
    """
    sender = From.replace("whatsapp:", "").strip()
    msg_text = Body.strip()

    logger.info(f"Incoming WhatsApp message from {ProfileName} ({sender}): '{msg_text}'")

    # Construct TwiML WhatsApp reply XML
    reply_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>
        <Body>Namaste {ProfileName}! 🏔️ Thanks for contacting Trekatour. Our AI Sales Assistant is reviewing your request for "{msg_text}". A representative or itinerary details will be shared with you shortly!</Body>
    </Message>
</Response>"""
    return Response(content=reply_xml, media_type="application/xml")
