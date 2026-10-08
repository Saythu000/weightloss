"""
FastAPI Voice Calling & Telephony Webhook Router
Triggers Twilio AI voice calls and returns TwiML WebSocket media streams.
"""

from fastapi import APIRouter, Response, Request, Body, Query
from fastapi.responses import HTMLResponse
from typing import Dict, Any, Optional
import os
import logging

logger = logging.getLogger("Trekatour.API.VoiceRouter")
router = APIRouter(prefix="/voice", tags=["Voice Telephony"])


@router.post("/twiml")
@router.get("/twiml")
async def get_twiml_media_stream(request: Request):
    """
    Returns TwiML XML response instructing Twilio to open a WebSocket media stream.
    """
    host = request.headers.get("host", "localhost:8000")
    ws_scheme = "wss" if "https" in str(request.url) else "ws"
    ws_url = f"{ws_scheme}://{host}/ws/voice"

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Google.en-IN-Wavenet-D">Connecting to Trekatour AI Travel Assistant...</Say>
    <Connect>
        <Stream url="{ws_url}" />
    </Connect>
</Response>"""
    return Response(content=twiml, media_type="application/xml")


@router.post("/outbound-call")
async def trigger_outbound_voice_call(
    phone: str = Body(..., embed=True),
    customer_name: str = Body("Traveler", embed=True),
):
    """
    Initiates an automated AI voice call to a sales lead using Twilio REST API.
    """
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
    from_number = os.environ.get("TWILIO_PHONE_NUMBER")

    if not account_sid or not auth_token or not from_number:
        logger.warning("Twilio credentials not configured. Simulating outbound call initiation.")
        return {
            "status": "SIMULATED",
            "message": f"Simulated call initiation to {phone} for {customer_name}",
            "call_sid": "CA_SIMULATED_123456789",
        }

    try:
        from twilio.rest import Client
        client = Client(account_sid, auth_token)

        # Host URL for callback
        twiml_url = os.environ.get("SERVER_PUBLIC_URL", "http://localhost:8000") + "/voice/twiml"
        call = client.calls.create(
            to=phone,
            from_=from_number,
            url=twiml_url,
        )
        return {
            "status": "SUCCESS",
            "message": f"Outbound call dispatched to {phone}",
            "call_sid": call.sid,
        }
    except Exception as e:
        logger.error(f"Failed to initiate Twilio call: {e}")
        return {"status": "ERROR", "message": str(e)}
