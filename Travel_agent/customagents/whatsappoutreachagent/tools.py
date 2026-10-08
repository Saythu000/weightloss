from __future__ import annotations
from typing import Any, Optional
from pydantic import BaseModel, Field
from tools.base import Tool, ToolKind, ToolResult


class SendTextMessageArgs(BaseModel):
    phone_number: str = Field(description="Recipient WhatsApp phone number with country code (e.g., 919876543210)")
    message: str = Field(description="WhatsApp formatted message text with emojis and formatting")


class SendTextMessageTool(Tool):
    name: str = "send_whatsapp_message"
    description: str = "Dispatches a formatted WhatsApp message to a traveler."
    kind: ToolKind = ToolKind.SYSTEM
    args_schema = SendTextMessageArgs

    def run(self, phone_number: str, message: str, **kwargs: Any) -> ToolResult:
        clean_phone = phone_number.replace("+", "").replace(" ", "").replace("-", "")
        return ToolResult(
            success=True,
            output=f"Successfully queued WhatsApp message to {clean_phone}: '{message[:60]}...'",
            metadata={"phone": clean_phone, "message_length": len(message)},
        )


class SendItineraryPdfArgs(BaseModel):
    phone_number: str = Field(description="Recipient WhatsApp phone number")
    destination: str = Field(description="Trip destination (e.g. Pondicherry, Gokarna)")
    brochure_url: Optional[str] = Field(default=None, description="Downloadable URL or path for the PDF brochure")


class SendItineraryPdfTool(Tool):
    name: str = "send_whatsapp_itinerary_pdf"
    description: str = "Delivers an official Trekatour PDF itinerary brochure link to the traveler on WhatsApp."
    kind: ToolKind = ToolKind.SYSTEM
    args_schema = SendItineraryPdfArgs

    def run(self, phone_number: str, destination: str, brochure_url: Optional[str] = None, **kwargs: Any) -> ToolResult:
        clean_phone = phone_number.replace("+", "").replace(" ", "").replace("-", "")
        url = brochure_url or f"https://trekatour.in/brochures/{destination.lower().replace(' ', '-')}-itinerary.pdf"
        caption = f"📄 *Official Trekatour Itinerary Brochure:* {destination}\nDownload & share with your travel buddies: {url}"

        return ToolResult(
            success=True,
            output=f"Dispatched PDF brochure for {destination} to {clean_phone} ({url})",
            metadata={"phone": clean_phone, "destination": destination, "brochure_url": url, "caption": caption},
        )
