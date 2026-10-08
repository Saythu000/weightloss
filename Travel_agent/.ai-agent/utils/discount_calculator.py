"""
Trekatour Group Discount & Dynamic Pricing Calculator Engine
Handles base trip pricing, tiered group volume discounts, seasonal promos, travel upgrades, and deposit calculations.
"""

from typing import Dict, Any, Optional
import math

# Default package base rates (INR)
DEFAULT_TRIP_PRICES: Dict[str, float] = {
    "gokarna": 6499.0,
    "coorg": 7999.0,
    "pondicherry": 5999.0,
    "wayanad": 7499.0,
    "manali": 12999.0,
    "kedarkantha": 14999.0,
    "hampi": 4999.0,
    "chikmagalur": 6999.0,
    "dudhsagar": 5499.0,
}

# Travel mode add-ons per person (INR)
TRAVEL_UPGRADES: Dict[str, float] = {
    "sl": 0.0,
    "sleeper": 0.0,
    "3ac": 1200.0,
    "2ac": 2200.0,
    "bus": 800.0,
    "volvo_bus": 1200.0,
    "flight_addon": 4500.0,
}

# Active promotional codes
PROMO_CODES: Dict[str, Dict[str, Any]] = {
    "TREK10": {"type": "percentage", "value": 10.0},
    "EARLYBIRD": {"type": "percentage", "value": 7.5},
    "HYD500": {"type": "flat", "value": 500.0},
    "TREKFAM": {"type": "percentage", "value": 12.0},
}


class DiscountCalculator:
    """
    Trekatour Dynamic Pricing & Group Discount Engine
    Calculates exact subtotal, group volume discounts, travel upgrades, promo discounts, GST (5%),
    and required seat-booking advance deposit (30%).
    """

    @staticmethod
    def get_group_discount_percentage(num_travelers: int) -> float:
        """
        Determines group discount tier based on total headcount:
        - 1-3 travelers: 0%
        - 4-7 travelers: 5%
        - 8-11 travelers: 8%
        - 12+ travelers: 12%
        """
        if num_travelers >= 12:
            return 12.0
        elif num_travelers >= 8:
            return 8.0
        elif num_travelers >= 4:
            return 5.0
        return 0.0

    @classmethod
    def calculate_price(
        cls,
        trip_name: str,
        num_travelers: int,
        travel_mode: str = "sleeper",
        promo_code: Optional[str] = None,
        base_price_override: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Full cost breakdown calculation.
        """
        if num_travelers <= 0:
            raise ValueError("Number of travelers must be at least 1")

        # Resolve base price
        trip_key = trip_name.lower().strip()
        if base_price_override is not None and base_price_override > 0:
            base_rate = float(base_price_override)
        else:
            base_rate = DEFAULT_TRIP_PRICES.get(trip_key, 6999.0)

        # Base Total
        base_subtotal = base_rate * num_travelers

        # Group Discount
        group_disc_pct = cls.get_group_discount_percentage(num_travelers)
        group_discount_amount = (base_subtotal * group_disc_pct) / 100.0

        # Travel Mode Upgrade
        mode_key = travel_mode.lower().strip()
        upgrade_per_person = TRAVEL_UPGRADES.get(mode_key, 0.0)
        total_upgrade_cost = upgrade_per_person * num_travelers

        # Subtotal after group discount + upgrades
        discounted_base = base_subtotal - group_discount_amount
        subtotal = discounted_base + total_upgrade_cost

        # Promo Code Discount
        promo_discount_amount = 0.0
        promo_applied = None
        if promo_code:
            code_clean = promo_code.upper().strip()
            if code_clean in PROMO_CODES:
                promo_info = PROMO_CODES[code_clean]
                if promo_info["type"] == "percentage":
                    promo_discount_amount = (subtotal * promo_info["value"]) / 100.0
                elif promo_info["type"] == "flat":
                    promo_discount_amount = min(subtotal, promo_info["value"] * num_travelers)
                promo_applied = code_clean

        taxable_total = max(0.0, subtotal - promo_discount_amount)

        # GST (5% for tour operators in India)
        gst_amount = (taxable_total * 5.0) / 100.0
        grand_total = taxable_total + gst_amount

        # Minimum required advance deposit for seat locking (30% or flat ₹2,000/person)
        deposit_per_person = max(2000.0, (grand_total / num_travelers) * 0.30)
        advance_deposit_required = math.ceil(deposit_per_person * num_travelers)

        return {
            "trip_name": trip_name.title(),
            "num_travelers": num_travelers,
            "base_rate_per_person": base_rate,
            "base_subtotal": base_subtotal,
            "group_discount_percentage": group_disc_pct,
            "group_discount_amount": round(group_discount_amount, 2),
            "travel_mode": mode_key.upper(),
            "travel_upgrade_per_person": upgrade_per_person,
            "total_travel_upgrade_cost": total_upgrade_cost,
            "promo_code_applied": promo_applied,
            "promo_discount_amount": round(promo_discount_amount, 2),
            "taxable_amount": round(taxable_total, 2),
            "gst_5_percent": round(gst_amount, 2),
            "grand_total": round(grand_total, 2),
            "effective_per_person_price": round(grand_total / num_travelers, 2),
            "advance_deposit_required": advance_deposit_required,
            "balance_amount_due": round(grand_total - advance_deposit_required, 2),
        }
