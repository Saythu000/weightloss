"""
Trekatour Payment & Booking Voucher Agent (Agent 6 - Arjun)
Specialized in Razorpay payment link generation, transaction verification, and booking voucher issuance.
"""

from __future__ import annotations
import uuid
import logging
from typing import AsyncGenerator, Optional, Any, List, Dict
from agent.agent import Agent
from agent.events import AgentEvent
from agent.session import SessionContext
from client.llm_client import AsyncLLMClient
from customagents.paymentagent.prompts import PAYMENT_AGENT_PROMPT
from customagents.paymentagent.tools import GeneratePaymentLinkTool, IssueBookingVoucherTool

logger = logging.getLogger("Trekatour.PaymentAgent")


class PaymentVoucherAgent(Agent):
    """
    Agent 6: Arjun - Payment Link & Booking Voucher Specialist.
    Issues secure Razorpay payment links and generates official confirmation vouchers.
    """

    DEFAULT_ALLOWED_TOOLS = [
        "generate_payment_link",
        "issue_booking_voucher",
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
        prompt = custom_system_prompt or PAYMENT_AGENT_PROMPT
        tools = allowed_tool_names or self.DEFAULT_ALLOWED_TOOLS
        super().__init__(
            name="PaymentVoucherAgent",
            system_prompt=prompt,
            allowed_tool_names=tools,
            llm_client=llm_client or AsyncLLMClient(),
            config=config,
        )
        self.system_prompt = prompt
        self.session = session or SessionContext(session_id="payment_voucher_session")

        # Register tools
        if not self.tool_registry.get("generate_payment_link"):
            self.tool_registry.register(GeneratePaymentLinkTool())
        if not self.tool_registry.get("issue_booking_voucher"):
            self.tool_registry.register(IssueBookingVoucherTool())

    def create_payment_link(
        self,
        lead_profile: Dict[str, Any],
        amount: Optional[float] = None,
        trip_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Creates a Razorpay payment link for the seat-locking advance.
        """
        name = lead_profile.get("customer_name") or lead_profile.get("name") or "Traveler"
        phone = lead_profile.get("phoneNumber") or lead_profile.get("phone") or "919876543210"
        dest = trip_name or lead_profile.get("destination") or "Weekend Trip"
        deposit = amount or lead_profile.get("total_advance_required") or 2000.0

        tool = self.tool_registry.get("generate_payment_link") or GeneratePaymentLinkTool()
        res = tool.run(
            customer_name=name,
            phone_number=phone,
            amount=deposit,
            trip_name=dest,
        )

        link_id = res.metadata.get("link_id", f"plink_{uuid.uuid4().hex[:8]}")
        payment_url = res.metadata.get("payment_url", f"https://rzp.io/l/{link_id}")

        whatsapp_pay_msg = (
            f"Hey *{name}*! 💳✨\n\n"
            f"*Arjun* here from *Trekatour Bookings Desk*! Your seat reservation link for *{dest}* is ready:\n\n"
            f"💰 *Advance Amount to Pay:* *₹{int(deposit):,}*\n"
            f"🔗 *Instant Payment Link:* {payment_url}\n\n"
            f"🔒 *Supported Methods:* Google Pay, PhonePe, Paytm UPI, Credit/Debit Cards, and NetBanking.\n"
            f"⚡ *Note:* This link is valid for 2 hours. Once paid, your seats are 100% reserved and your official Trekatour Booking Voucher will be issued immediately!"
        )

        return {
            "link_id": link_id,
            "payment_url": payment_url,
            "amount": int(deposit),
            "customer_name": name,
            "destination": dest,
            "whatsapp_message": whatsapp_pay_msg,
        }

    def issue_voucher(
        self,
        lead_profile: Dict[str, Any],
        payment_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generates official Trekatour Booking Confirmation Voucher.
        """
        name = lead_profile.get("customer_name") or lead_profile.get("name") or "Traveler"
        dest = lead_profile.get("destination") or "Pondicherry"
        group_size = lead_profile.get("group_size") or 1
        advance = lead_profile.get("total_advance_required") or lead_profile.get("advance_paid") or 2000
        balance = lead_profile.get("balance_due_at_boarding") or 0
        departure = lead_profile.get("departure_city") or "Hyderabad"

        tool = self.tool_registry.get("issue_booking_voucher") or IssueBookingVoucherTool()
        res = tool.run(
            customer_name=name,
            destination=dest,
            group_size=group_size,
            advance_paid=advance,
            balance_due=balance,
            departure_city=departure,
            payment_id=payment_id,
        )

        voucher = res.metadata
        ref_id = voucher.get("booking_reference", "TK-2026-CONFIRMED")
        tx_id = voucher.get("payment_id", payment_id or "pay_simulated")
        voucher_url = voucher.get("voucher_download_url", f"https://trekatour.in/vouchers/{ref_id}.pdf")

        whatsapp_confirm_msg = (
            f"🎉 *BOOKING CONFIRMED! WELCOME TO TREKATOUR!* 🎒✨\n\n"
            f"Hey *{name}*, your weekend getaway to *{dest}* is officially locked!\n\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"🎟️ *Booking ID:* *{ref_id}*\n"
            f"💳 *Transaction ID:* `{tx_id}`\n"
            f"👥 *Total Travelers:* {group_size} Pax\n"
            f"💵 *Advance Paid:* ₹{int(advance):,}\n"
            f"🤝 *Balance Due at Boarding:* ₹{int(balance):,}\n"
            f"🚆 *Departure:* {departure} (Friday Evening)\n"
            f"━━━━━━━━━━━━━━━━━━━━\n\n"
            f"📄 *Download Your Official PDF Voucher:*\n{voucher_url}\n\n"
            f"Our Trip Captain will reach out 24 hours prior to departure with your bus/train berth numbers and coordinator contacts. Get ready for an epic adventure! 🌴🔥"
        )

        voucher["whatsapp_message"] = whatsapp_confirm_msg
        return voucher

    async def run(
        self,
        user_prompt: str,
        session: Optional[SessionContext] = None,
        force_tool_choice: Optional[str] = None,
    ) -> AsyncGenerator[AgentEvent, None]:
        """Runs a conversational turn handling payment questions."""
        target_session = session or self.session
        async for event in super().run(
            user_prompt=user_prompt,
            session=target_session,
            force_tool_choice=force_tool_choice,
        ):
            yield event


PaymentAgent = PaymentVoucherAgent


def create_payment_agent(
    llm_client: Optional[AsyncLLMClient] = None,
    config: Optional[Any] = None,
    session: Optional[SessionContext] = None,
) -> PaymentVoucherAgent:
    """Factory helper for instantiating the Payment Voucher Agent."""
    return PaymentVoucherAgent(
        llm_client=llm_client,
        config=config,
        session=session,
    )
