"""
Trekatour WhatsApp Outreach Agent (Agent 5 - Sameer)
Specialized in automated messaging, PDF brochure delivery, and follow-up sequences.
"""

from __future__ import annotations
import logging
from typing import AsyncGenerator, Optional, Any, List, Dict
from agent.agent import Agent
from agent.events import AgentEvent
from agent.session import SessionContext
from client.llm_client import AsyncLLMClient
from customagents.whatsappoutreachagent.prompts import WHATSAPP_AGENT_PROMPT
from customagents.whatsappoutreachagent.tools import SendTextMessageTool, SendItineraryPdfTool

logger = logging.getLogger("Trekatour.WhatsAppAgent")


class WhatsAppOutreachAgent(Agent):
    """
    Agent 5: Sameer - WhatsApp Outreach & Broadcasting Specialist.
    Dispatches tailored itineraries, PDF brochure links, group quotes, and re-engagement nudges.
    """

    DEFAULT_ALLOWED_TOOLS = [
        "send_whatsapp_message",
        "send_whatsapp_itinerary_pdf",
        "log_lead_status",
    ]

    def __init__(
        self,
        llm_client: Optional[AsyncLLMClient] = None,
        config: Optional[Any] = None,
        custom_system_prompt: Optional[str] = None,
        allowed_tool_names: Optional[List[str]] = None,
        session: Optional[SessionContext] = None,
    ):
        prompt = custom_system_prompt or WHATSAPP_AGENT_PROMPT
        tools = allowed_tool_names or self.DEFAULT_ALLOWED_TOOLS
        super().__init__(
            name="WhatsAppOutreachAgent",
            system_prompt=prompt,
            allowed_tool_names=tools,
            llm_client=llm_client or AsyncLLMClient(),
            config=config,
        )
        self.system_prompt = prompt
        self.session = session or SessionContext(session_id="whatsapp_outreach_session")

        # Register tools
        if not self.tool_registry.get("send_whatsapp_message"):
            self.tool_registry.register(SendTextMessageTool())
        if not self.tool_registry.get("send_whatsapp_itinerary_pdf"):
            self.tool_registry.register(SendItineraryPdfTool())

    def compose_brochure_package(
        self,
        lead_profile: Dict[str, Any],
        itinerary: Optional[Dict[str, Any]] = None,
        quote: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Combines itinerary, pricing quote, and PDF download link into an omnichannel WhatsApp payload.
        """
        name = lead_profile.get("customer_name") or lead_profile.get("name") or "Traveler"
        dest = lead_profile.get("destination") or (itinerary.get("destination") if itinerary else "Weekend Getaway")
        group_size = lead_profile.get("group_size") or (quote.get("group_size") if quote else 1)
        phone = lead_profile.get("phoneNumber") or lead_profile.get("phone") or "Unknown"

        slug = dest.lower().replace(" ", "-").replace("&", "and")
        pdf_url = f"https://trekatour.in/brochures/{slug}-itinerary.pdf"

        msg_body = (
            f"Hey *{name}*! 🌴🎒\n\n"
            f"*Sameer* here from *Trekatour Hyderabad*! As promised, here is your complete travel package for *{dest}*:\n\n"
        )

        if itinerary:
            msg_body += (
                f"📍 *Package:* {itinerary.get('packageName', dest)}\n"
                f"⏱️ *Duration:* {itinerary.get('duration', '2N/3D Weekend')}\n"
                f"🚆 *Departure:* {itinerary.get('departureCity', 'Hyderabad')} (Friday Evening)\n\n"
            )

        if quote:
            msg_body += (
                f"💰 *Group Quote ({group_size} Travelers):*\n"
                f"• Regular Subtotal: ₹{quote.get('subtotal', 0):,}/-\n"
                f"• Total Group Savings: -₹{quote.get('total_discount_amount', 0):,}\n"
                f"• *Payable Total:* ₹{quote.get('final_total', 0):,} (Just *₹{quote.get('perPersonEffective', quote.get('per_person_effective', 0)):,}* / person)\n\n"
                f"🎟️ *Advance to Lock Seats:* *₹{quote.get('totalAdvanceRequired', quote.get('total_advance_required', 0)):,}*\n"
                f"🤝 *Balance at Boarding:* ₹{quote.get('balanceDueAtBoarding', quote.get('balance_due_at_boarding', 0)):,}\n\n"
            )

        msg_body += (
            f"📄 *Download Official PDF Brochure:* {pdf_url}\n\n"
            f"Seats for this weekend are filling up fast! Reply *LOCK SEATS* and Arjun will send your secure Razorpay reservation link right away! 🚀"
        )

        return {
            "recipient_phone": phone,
            "destination": dest,
            "customer_name": name,
            "message_text": msg_body,
            "pdf_url": pdf_url,
            "advance_required": quote.get("total_advance_required", 0) if quote else 0,
        }

    def compose_followup_message(
        self,
        lead_profile: Dict[str, Any],
        followup_type: str = "2_HOUR_NUDGE",
    ) -> str:
        """
        Generates targeted re-engagement follow-up messages.
        """
        name = lead_profile.get("customer_name") or lead_profile.get("name") or "there"
        dest = lead_profile.get("destination") or "your weekend trip"
        group_size = lead_profile.get("group_size") or 2

        if followup_type == "2_HOUR_NUDGE":
            return (
                f"Hey *{name}*! 👋 Just checking in — were you able to discuss the *{dest}* itinerary with your group of {group_size}?\n\n"
                f"We only have *6 seats remaining* on the Trekatour sleeper bus from Hyderabad for this weekend! Let me know if you have any questions or want to lock your seats with the advance booking deposit. 😊"
            )
        elif followup_type == "24_HOUR_WARNING":
            return (
                f"Hi *{name}*! ⏰ Final reminder regarding your *{dest}* booking!\n\n"
                f"Our train & homestay reservation cutoff closes tonight. Would you like to reserve your seats today so you don't miss out on this weekend's departure? Reply *YES* to get your Razorpay link! 🎒"
            )
        else:
            return f"Hi *{name}*, let us know if you'd like to proceed with your *{dest}* reservation!"

    async def run(
        self,
        user_prompt: str,
        session: Optional[SessionContext] = None,
        force_tool_choice: Optional[str] = None,
    ) -> AsyncGenerator[AgentEvent, None]:
        """Runs a conversational turn handling traveler outreach."""
        target_session = session or self.session
        async for event in super().run(
            user_prompt=user_prompt,
            session=target_session,
            force_tool_choice=force_tool_choice,
        ):
            yield event


WhatsAppAgent = WhatsAppOutreachAgent


def create_whatsapp_agent(
    llm_client: Optional[AsyncLLMClient] = None,
    config: Optional[Any] = None,
    session: Optional[SessionContext] = None,
) -> WhatsAppOutreachAgent:
    """Factory helper for instantiating the WhatsApp Outreach Agent."""
    return WhatsAppOutreachAgent(
        llm_client=llm_client,
        config=config,
        session=session,
    )
