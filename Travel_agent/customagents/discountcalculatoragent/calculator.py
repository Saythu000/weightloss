"""
Trekatour Dynamic Pricing & Group Discount Calculation Engine
Implements volume group tiers, promotional coupon codes, and margin guardrails.
"""

from __future__ import annotations
import math
from typing import Dict, Any, Optional

# Max discount cap to protect agency profit margin
MAX_MARGIN_DISCOUNT_PERCENT = 20.0

VALID_PROMO_CODES = {
    "TREK500": {"discount_per_person": 500, "min_group_size": 1, "description": "Flat ₹500 off per person"},
    "TREK1000": {"discount_per_person": 1000, "min_group_size": 4, "description": "Flat ₹1000 off per person for groups of 4+"},
    "EARLYBIRD": {"percent_discount": 5.0, "min_group_size": 1, "description": "5% Early Bird discount"},
}


def get_group_discount_tier(group_size: int) -> float:
    """
    Returns group discount percentage based on traveler volume:
    - 1-3 Pax: 0% (Standard Rate)
    - 4-7 Pax: 5% (Small Group Discount)
    - 8-15 Pax: 10% (Large Group Discount)
    - 16+ Pax: 15% (VIP Enterprise Discount)
    """
    if group_size >= 16:
        return 15.0
    elif group_size >= 8:
        return 10.0
    elif group_size >= 4:
        return 5.0
    return 0.0


def compute_trip_quote(
    base_price_per_person: float,
    group_size: int = 1,
    advance_per_person: Optional[float] = None,
    promo_code: Optional[str] = None,
    destination: str = "Pondicherry",
    customer_name: str = "Traveler",
) -> Dict[str, Any]:
    """
    Computes a full financial breakdown for the trip.
    """
    if group_size < 1:
        group_size = 1

    # Base Subtotal
    subtotal = float(base_price_per_person * group_size)

    # 1. Group Volume Discount
    tier_percent = get_group_discount_tier(group_size)
    tier_discount_amount = (tier_percent / 100.0) * subtotal

    # 2. Promo Code Discount
    promo_discount_amount = 0.0
    applied_promo = None
    if promo_code:
        code_upper = promo_code.strip().upper()
        if code_upper in VALID_PROMO_CODES:
            rule = VALID_PROMO_CODES[code_upper]
            if group_size >= rule.get("min_group_size", 1):
                if "discount_per_person" in rule:
                    promo_discount_amount = float(rule["discount_per_person"] * group_size)
                elif "percent_discount" in rule:
                    promo_discount_amount = (rule["percent_discount"] / 100.0) * subtotal
                applied_promo = {"code": code_upper, "description": rule["description"]}

    # 3. Apply Margin Guardrail
    raw_total_discount = tier_discount_amount + promo_discount_amount
    max_allowed_discount = (MAX_MARGIN_DISCOUNT_PERCENT / 100.0) * subtotal
    effective_discount = min(raw_total_discount, max_allowed_discount)
    is_margin_capped = raw_total_discount > max_allowed_discount

    effective_discount_percent = round((effective_discount / subtotal) * 100.0, 1) if subtotal > 0 else 0.0

    # Final Totals
    final_total = round(subtotal - effective_discount)
    per_person_effective = round(final_total / group_size)

    # Advance Deposit Schedule
    if advance_per_person is None:
        # Default ~25-30% deposit rounded to nearest 500
        advance_per_person = 2000.0 if base_price_per_person >= 6000 else 1500.0

    total_advance_required = round(advance_per_person * group_size)
    balance_due_at_boarding = max(0, final_total - total_advance_required)

    # Compose WhatsApp Quote Message
    whatsapp_msg = (
        f"Hey *{customer_name}*! 💰🎉\n\n"
        f"Priya here from *Trekatour Dynamic Pricing Desk*! Here is your official verified quote for *{destination}*:\n\n"
        f"👥 *Travelers:* {group_size} pax\n"
        f"🏷️ *Standard Price:* ₹{int(base_price_per_person):,}/- per person\n"
        f"💵 *Subtotal:* ₹{int(subtotal):,}/-\n"
    )

    if tier_percent > 0:
        whatsapp_msg += f"✨ *Group Discount ({int(tier_percent)}% Tier):* -₹{int(tier_discount_amount):,}\n"

    if applied_promo:
        whatsapp_msg += f"🎟️ *Promo Code ({applied_promo['code']}):* -₹{int(promo_discount_amount):,}\n"

    whatsapp_msg += (
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"🔥 *FINAL PAYABLE TOTAL:* ₹{int(final_total):,} (Just *₹{int(per_person_effective):,}* / person!)\n"
        f"🎉 *Total Group Savings:* ₹{int(effective_discount):,}\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"💳 *Advance to Lock Seats Today:* ₹{int(total_advance_required):,} (₹{int(advance_per_person):,} x {group_size})\n"
        f"🤝 *Balance Due on Departure Day:* ₹{int(balance_due_at_boarding):,}\n\n"
        f"Would you like our Payment Specialist (*Arjun*) to generate your instant Razorpay booking link for the advance amount?"
    )

    return {
        "destination": destination,
        "customer_name": customer_name,
        "group_size": group_size,
        "base_price_per_person": round(base_price_per_person),
        "subtotal": round(subtotal),
        "tier_discount_percent": tier_percent,
        "tier_discount_amount": round(tier_discount_amount),
        "applied_promo_code": applied_promo["code"] if applied_promo else None,
        "promo_discount_amount": round(promo_discount_amount),
        "total_discount_amount": round(effective_discount),
        "effective_discount_percent": effective_discount_percent,
        "is_margin_capped": is_margin_capped,
        "final_total": round(final_total),
        "per_person_effective": round(per_person_effective),
        "advance_per_person": round(advance_per_person),
        "total_advance_required": round(total_advance_required),
        "balance_due_at_boarding": round(balance_due_at_boarding),
        "whatsapp_message": whatsapp_msg,
    }
