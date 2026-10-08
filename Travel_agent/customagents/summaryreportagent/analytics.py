"""
Trekatour CRM Analytics & Lead Intent Scoring Engine
Computes purchase intent scores, generates executive dossiers, and aggregates sales pipeline metrics.
"""

from __future__ import annotations
from typing import Dict, Any, List, Optional


def calculate_intent_score(lead_profile: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes a 0-100 purchase intent score and readiness tier.
    """
    payment_status = (lead_profile.get("paymentStatus") or "").upper()
    intake_status = (lead_profile.get("intakeStatus") or "").upper()
    group_size = int(lead_profile.get("group_size") or lead_profile.get("groupSize") or 1)
    dates = str(lead_profile.get("travel_dates") or lead_profile.get("travelDates") or "")

    score = 30
    tier = "COLD / INCOMPLETE"
    reason = "Lead is currently in initial intake"

    if payment_status == "PAID" or intake_status == "BOOKED":
        score = 100
        tier = "HOT / BOOKED"
        reason = "Booking deposit paid and voucher issued"
    elif intake_status == "PAYMENT_LINK_SENT":
        score = 90
        tier = "HOT / READY TO PAY"
        reason = "Payment link generated, awaiting advance deposit"
    elif intake_status == "BROCHURE_SENT":
        score = 75
        tier = "WARM / EVALUATING"
        reason = "Customized brochure and group quote delivered"
    elif intake_status == "COMPLETED":
        score = 65
        tier = "WARM / QUALIFIED"
        reason = "Intake qualification complete, itinerary matched"

    # Signals & Bonuses
    if group_size >= 4 and score < 100:
        score += 5
    if dates and dates.lower() not in ["flexible", "any", "not specified"] and score < 100:
        score += 5

    score = min(100, max(0, score))

    return {
        "intent_score": score,
        "readiness_tier": tier,
        "primary_reason": reason,
        "group_size": group_size,
    }


def generate_crm_dossier(
    lead_profile: Dict[str, Any],
    itinerary: Optional[Dict[str, Any]] = None,
    quote: Optional[Dict[str, Any]] = None,
    voucher: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Produces a concise executive CRM summary dossier for sales managers.
    """
    name = lead_profile.get("customer_name") or lead_profile.get("name") or "Traveler"
    phone = lead_profile.get("phoneNumber") or lead_profile.get("phone") or "Unknown"
    dest = lead_profile.get("destination") or (itinerary.get("destination") if itinerary else "Weekend Getaway")
    group_size = int(lead_profile.get("group_size") or (quote.get("group_size") if quote else 1))
    departure = lead_profile.get("departure_city") or "Hyderabad"

    scoring = calculate_intent_score(lead_profile)
    deal_value = quote.get("final_total") if quote else (quote.get("finalTotal") if quote else 0)
    advance_req = quote.get("total_advance_required") if quote else (quote.get("totalAdvanceRequired") if quote else 0)

    # Recommended human action
    if scoring["readiness_tier"] == "HOT / BOOKED":
        action = f"✅ Deal Closed! Assign Trip Captain and send Hyderabad bus boarding coordinates 24h prior."
    elif scoring["readiness_tier"] == "HOT / READY TO PAY":
        action = f"⚡ High-Priority Follow-up: Call {name} to resolve any payment/checkout questions for ₹{advance_req:,} advance."
    elif scoring["readiness_tier"] == "WARM / EVALUATING":
        action = f"📲 WhatsApp Re-engagement: Check in on group date alignment for {group_size} travelers to {dest}."
    else:
        action = f"📞 Outbound Call: Re-engage traveler to complete intake destination preferences."

    summary_bullets = [
        f"Traveler: {name} ({phone}) planning {group_size} pax trip to {dest} from {departure}.",
        f"Commercial Status: {scoring['readiness_tier']} (Intent Score: {scoring['intent_score']}/100).",
        f"Deal Financials: Total Value ₹{deal_value:,} | Advance Deposit ₹{advance_req:,}.",
    ]

    return {
        "lead_phone": phone,
        "customer_name": name,
        "destination": dest,
        "group_size": group_size,
        "intent_score": scoring["intent_score"],
        "readiness_tier": scoring["readiness_tier"],
        "deal_valuation_inr": deal_value,
        "advance_required_inr": advance_req,
        "recommended_action": action,
        "executive_summary_bullets": summary_bullets,
        "booking_reference": voucher.get("booking_reference") if voucher else None,
    }


def aggregate_pipeline_metrics(leads_list: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes agency-wide sales pipeline performance metrics.
    """
    total_leads = len(leads_list)
    booked_count = 0
    booked_revenue = 0
    pipeline_value = 0
    hot_leads_count = 0
    destination_counts: Dict[str, int] = {}

    for lead in leads_list:
        status = (lead.get("paymentStatus") or "").upper()
        intake = (lead.get("intakeStatus") or "").upper()
        dest = lead.get("destination") or "General"
        destination_counts[dest] = destination_counts.get(dest, 0) + 1

        quote = lead.get("pricingQuote") or lead.get("partnershipDetails", {}).get("pricingQuote") or {}
        final_total = quote.get("final_total") or quote.get("finalTotal") or 7499

        if status == "PAID" or intake == "BOOKED":
            booked_count += 1
            booked_revenue += final_total
        else:
            pipeline_value += final_total
            if intake in ["PAYMENT_LINK_SENT", "BROCHURE_SENT"]:
                hot_leads_count += 1

    conversion_rate = round((booked_count / total_leads * 100), 1) if total_leads > 0 else 0.0

    return {
        "total_leads_tracked": total_leads,
        "confirmed_bookings": booked_count,
        "total_booked_revenue_inr": booked_revenue,
        "active_pipeline_value_inr": pipeline_value,
        "conversion_rate_percent": conversion_rate,
        "hot_leads_evaluating": hot_leads_count,
        "top_destinations": destination_counts,
    }
