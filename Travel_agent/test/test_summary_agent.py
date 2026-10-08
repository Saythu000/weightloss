"""
Unit Tests for Agent 7: Summary & Sales Analytics Agent (Neha)
"""

import pytest
from customagents.summaryreportagent.agent import SummaryReportAgent, create_summary_agent
from customagents.summaryreportagent.analytics import (
    calculate_intent_score,
    generate_crm_dossier,
    aggregate_pipeline_metrics,
)
from customagents.factory import AgentFactory


def test_calculate_intent_score():
    # 1. Booked lead
    lead_booked = {
        "customer_name": "Sneha Rao",
        "paymentStatus": "PAID",
        "intakeStatus": "BOOKED",
        "group_size": 4,
    }
    score_booked = calculate_intent_score(lead_booked)
    assert score_booked["intent_score"] == 100
    assert score_booked["readiness_tier"] == "HOT / BOOKED"

    # 2. Payment link sent
    lead_pay = {
        "customer_name": "Rahul Verma",
        "intakeStatus": "PAYMENT_LINK_SENT",
        "group_size": 2,
    }
    score_pay = calculate_intent_score(lead_pay)
    assert score_pay["intent_score"] == 90
    assert score_pay["readiness_tier"] == "HOT / READY TO PAY"

    # 3. Brochure sent with group bonus
    lead_brochure = {
        "customer_name": "Ananya Sharma",
        "intakeStatus": "BROCHURE_SENT",
        "group_size": 5,
        "travel_dates": "Next weekend",
    }
    score_brochure = calculate_intent_score(lead_brochure)
    assert score_brochure["intent_score"] == 85  # 75 base + 5 group bonus + 5 date bonus
    assert score_brochure["readiness_tier"] == "WARM / EVALUATING"

    # 4. Incomplete intake
    lead_raw = {
        "customer_name": "New User",
        "intakeStatus": "IN_PROGRESS",
        "group_size": 1,
    }
    score_raw = calculate_intent_score(lead_raw)
    assert score_raw["intent_score"] == 30
    assert score_raw["readiness_tier"] == "COLD / INCOMPLETE"


def test_generate_crm_dossier():
    agent = create_summary_agent()

    profile = {
        "customer_name": "Sneha Rao",
        "phoneNumber": "919876543210",
        "destination": "Pondicherry",
        "group_size": 4,
        "paymentStatus": "PAID",
        "intakeStatus": "BOOKED",
    }
    quote = {
        "final_total": 26496,
        "total_advance_required": 8000,
    }
    voucher = {
        "booking_reference": "TK-2026-PONDI-CB9E",
    }

    dossier = agent.generate_lead_dossier(profile, quote=quote, voucher=voucher)

    assert dossier["customer_name"] == "Sneha Rao"
    assert dossier["destination"] == "Pondicherry"
    assert dossier["intent_score"] == 100
    assert dossier["deal_valuation_inr"] == 26496
    assert dossier["booking_reference"] == "TK-2026-PONDI-CB9E"
    assert "Deal Closed" in dossier["recommended_action"]
    assert len(dossier["executive_summary_bullets"]) == 3


def test_aggregate_pipeline_metrics():
    leads = [
        {
            "destination": "Pondicherry",
            "paymentStatus": "PAID",
            "intakeStatus": "BOOKED",
            "pricingQuote": {"final_total": 26496},
        },
        {
            "destination": "Gokarna",
            "paymentStatus": "PENDING",
            "intakeStatus": "PAYMENT_LINK_SENT",
            "pricingQuote": {"final_total": 10998},
        },
        {
            "destination": "Coorg",
            "paymentStatus": "PENDING",
            "intakeStatus": "BROCHURE_SENT",
            "pricingQuote": {"final_total": 11998},
        },
    ]

    metrics = aggregate_pipeline_metrics(leads)

    assert metrics["total_leads_tracked"] == 3
    assert metrics["confirmed_bookings"] == 1
    assert metrics["total_booked_revenue_inr"] == 26496
    assert metrics["active_pipeline_value_inr"] == 22996
    assert metrics["conversion_rate_percent"] == 33.3
    assert metrics["hot_leads_evaluating"] == 2
    assert "Pondicherry" in metrics["top_destinations"]


def test_summary_agent_factory():
    agent = AgentFactory.create_agent("summary_agent")
    assert isinstance(agent, SummaryReportAgent)
    assert "get_customer_memory" in agent.allowed_tool_names
    assert "log_lead_status" in agent.allowed_tool_names
