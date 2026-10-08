from __future__ import annotations
import json
from typing import Any, Optional
from pydantic import BaseModel, Field
from tools.base import Tool, ToolKind, ToolResult
from customagents.discountcalculatoragent.calculator import compute_trip_quote


class PricingInput(BaseModel):
    base_price_per_person: float = Field(description="Base package cost per person in INR (e.g., 7499 for Pondicherry, 5499 for Gokarna)")
    group_size: int = Field(default=1, description="Number of travelers in the booking group")
    promo_code: Optional[str] = Field(default=None, description="Optional promotional coupon code (e.g. TREK500, EARLYBIRD)")
    advance_per_person: Optional[float] = Field(default=None, description="Advance deposit required per person (default 2000 or 1500)")
    destination: str = Field(default="Weekend Getaway", description="Name of destination (e.g. Pondicherry, Gokarna)")
    customer_name: str = Field(default="Traveler", description="Name of customer")


class PricingCalculatorTool(Tool):
    name: str = "calculate_pricing"
    description: str = "Calculates exact trip costs, dynamic group discount tiers (5% for 4+, 10% for 8+, 15% for 16+), promo code savings, and required seat reservation deposit."
    kind: ToolKind = ToolKind.SYSTEM
    args_schema = PricingInput

    def run(
        self,
        base_price_per_person: float,
        group_size: int = 1,
        promo_code: Optional[str] = None,
        advance_per_person: Optional[float] = None,
        destination: str = "Weekend Getaway",
        customer_name: str = "Traveler",
        **kwargs: Any,
    ) -> ToolResult:
        try:
            quote = compute_trip_quote(
                base_price_per_person=base_price_per_person,
                group_size=group_size,
                advance_per_person=advance_per_person,
                promo_code=promo_code,
                destination=destination,
                customer_name=customer_name,
            )

            output_summary = (
                f"Subtotal: ₹{quote['subtotal']:,} | "
                f"Group Discount ({quote['tier_discount_percent']}%): -₹{quote['tier_discount_amount']:,} | "
                f"Final Total: ₹{quote['final_total']:,} (₹{quote['per_person_effective']:,}/pax) | "
                f"Advance Deposit: ₹{quote['total_advance_required']:,} | "
                f"Balance Due: ₹{quote['balance_due_at_boarding']:,}"
            )

            return ToolResult(
                success=True,
                output=output_summary,
                metadata={"quote": quote},
            )
        except Exception as e:
            return ToolResult(
                success=False,
                output="",
                error=f"Error calculating pricing: {str(e)}",
            )
