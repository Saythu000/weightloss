"""
Master Supervisor Delegation Tools
Allows Agent #0 (Kabir) to orchestrate specialized worker agents as callable tools.
"""

from __future__ import annotations
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from tools.base import Tool, ToolKind, ToolResult
from customagents.itineraryragagent.knowledge_loader import search_destination_knowledge
from customagents.discountcalculatoragent.calculator import compute_trip_quote
from customagents.paymentagent.tools import GeneratePaymentLinkTool
from customagents.whatsappoutreachagent.tools import SendTextMessageTool


# 1. Consult Itinerary Tool Schema & Class
class ConsultItineraryArgs(BaseModel):
    destination: str = Field(..., description="Destination name (e.g. Pondicherry, Gokarna, Coorg, Manali, Dandeli)")
    query: Optional[str] = Field(None, description="Specific query like inclusions, day-wise plan, campsite, departure")


class ConsultItineraryTool(Tool):
    name: str = "consult_itinerary"
    description: str = "Delegates factual travel itinerary and package inquiries to Rohan (Itinerary Agent)."
    kind: ToolKind = ToolKind.RAG
    args_schema: type[BaseModel] = ConsultItineraryArgs

    def run(self, destination: str, query: Optional[str] = None, **kwargs: Any) -> ToolResult:
        records = search_destination_knowledge(destination, top_k=3)
        if not records:
            return ToolResult(
                success=False,
                output=f"No verified package found for '{destination}'. Available destinations: Pondicherry, Gokarna, Coorg, Manali, Dandeli.",
                error="DestinationNotFound"
            )

        combined = "\n\n".join([f"[{r['category']}] {r['title']}:\n{r['content']}" for r in records])
        output = f"Factual Package Records for {destination}:\n{combined}"

        return ToolResult(success=True, output=output, metadata={"records": records, "destination": destination})


# 2. Calculate Pricing Tool Schema & Class
class CalculatePricingArgs(BaseModel):
    destination: str = Field(..., description="Trip destination (e.g. Pondicherry, Gokarna, Coorg, Manali, Dandeli)")
    group_size: int = Field(1, description="Number of travelers in the group (pax count)")
    promo_code: Optional[str] = Field(None, description="Optional promo code like TREK500, TREK1000, EARLYBIRD")


class CalculatePricingTool(Tool):
    name: str = "calculate_group_pricing"
    description: str = "Delegates commercial quote calculation and group discount tier verification to Priya (Pricing Agent)."
    kind: ToolKind = ToolKind.SYSTEM
    args_schema: type[BaseModel] = CalculatePricingArgs

    def run(self, destination: str, group_size: int = 1, promo_code: Optional[str] = None, **kwargs: Any) -> ToolResult:
        destination_rates = {
            "pondicherry": 7499,
            "gokarna": 5499,
            "coorg": 5999,
            "manali": 11999,
            "dandeli": 4999,
        }
        dest_clean = destination.lower().strip()
        base_price = 7499
        for key, price in destination_rates.items():
            if key in dest_clean:
                base_price = price
                break

        quote = compute_trip_quote(
            base_price_per_person=base_price,
            group_size=group_size,
            promo_code=promo_code,
            destination=destination
        )

        output = (
            f"Verified Commercial Quote for {group_size} Pax to {destination}:\n"
            f"- Base Package: ₹{quote['base_price_per_person']:,} x {group_size} = ₹{quote['subtotal']:,}\n"
            f"- Tier Discount: {quote['tier_discount_percent']}% (Saved ₹{quote['tier_discount_amount']:,})\n"
            f"- Promo Discount: Saved ₹{quote['promo_discount_amount']:,}\n"
            f"- Final Total Deal Value: ₹{quote['final_total']:,}\n"
            f"- Advance Deposit to Lock Seats: ₹{quote['total_advance_required']:,} (₹2,000/seat)\n"
            f"- Balance Due at Boarding: ₹{quote['balance_due_at_boarding']:,}\n"
            f"- Margin Guardrail: {'APPLIED (Capped at 20%)' if quote['is_margin_capped'] else 'Compliant (≤ 20%)'}"
        )

        return ToolResult(success=True, output=output, metadata=quote)


# 3. Generate Payment Link Tool Schema & Class
class GeneratePaymentArgs(BaseModel):
    customer_name: str = Field(..., description="Traveler full name")
    phone_number: str = Field(..., description="Traveler phone number")
    amount: int = Field(..., description="Advance deposit amount in INR")
    trip_name: str = Field(..., description="Destination or trip name")


class GeneratePaymentDelegationTool(Tool):
    name: str = "generate_payment_link"
    description: str = "Delegates secure Razorpay advance deposit checkout link generation to Arjun (Payment Agent)."
    kind: ToolKind = ToolKind.SYSTEM
    args_schema: type[BaseModel] = GeneratePaymentArgs

    def __init__(self):
        super().__init__()
        self._payment_tool = GeneratePaymentLinkTool()

    def run(self, customer_name: str, phone_number: str, amount: int, trip_name: str, **kwargs: Any) -> ToolResult:
        return self._payment_tool.run(
            customer_name=customer_name,
            phone_number=phone_number,
            amount=amount,
            trip_name=trip_name
        )


# 4. Dispatch WhatsApp Message Tool Schema & Class
class DispatchWhatsAppArgs(BaseModel):
    phone_number: str = Field(..., description="Recipient phone number with country code")
    message_text: str = Field(..., description="Formatted message text to dispatch")


class DispatchWhatsAppDelegationTool(Tool):
    name: str = "dispatch_whatsapp_message"
    description: str = "Delegates WhatsApp broadcast delivery, PDF brochure links, and follow-ups to Sameer (WhatsApp Agent)."
    kind: ToolKind = ToolKind.SYSTEM
    args_schema: type[BaseModel] = DispatchWhatsAppArgs

    def __init__(self):
        super().__init__()
        self._wa_tool = SendTextMessageTool()

    def run(self, phone_number: str, message_text: str, **kwargs: Any) -> ToolResult:
        return self._wa_tool.run(
            phone_number=phone_number,
            message=message_text
        )


# 5. Escalate to Human Manager Tool Schema & Class
class EscalateToHumanArgs(BaseModel):
    reason: str = Field(..., description="Specific reason for human manager intervention")
    priority: str = Field("HIGH", description="Priority level: URGENT, HIGH, MEDIUM, LOW")
    traveler_details: Optional[Dict[str, Any]] = Field(None, description="Optional lead context dictionary")


class EscalateToHumanTool(Tool):
    name: str = "escalate_to_human"
    description: str = "Triggers Human-in-the-Loop (HITL) circuit breaker for offline customization, disputes, or VIP corporate groups."
    kind: ToolKind = ToolKind.SYSTEM
    args_schema: type[BaseModel] = EscalateToHumanArgs

    def run(self, reason: str, priority: str = "HIGH", traveler_details: Optional[Dict[str, Any]] = None, **kwargs: Any) -> ToolResult:
        output = f"🚨 Human-in-the-Loop Escalation Created [Priority: {priority.upper()}]: {reason}"
        return ToolResult(
            success=True,
            output=output,
            metadata={
                "escalated": True,
                "reason": reason,
                "priority": priority.upper(),
                "traveler_details": traveler_details or {},
            }
        )
