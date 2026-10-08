"""
Unit Tests for Agent #0: Master Sales Supervisor Agent ("Kabir")
Orchestrator-Workers Architecture for Trekatour Sales Workforce.
"""

import pytest
from customagents.masteragent.supervisor import MasterSupervisorAgent, create_master_supervisor
from customagents.masteragent.tools import (
    ConsultItineraryTool,
    CalculatePricingTool,
    GeneratePaymentDelegationTool,
    DispatchWhatsAppDelegationTool,
    EscalateToHumanTool,
)
from customagents.masteragent.prompts import STRATEGY_PRESETS, get_master_prompt
from customagents.factory import AgentFactory


def test_master_supervisor_instantiation():
    supervisor = create_master_supervisor(strategy_mode="HIGH_CONVERSION_CLOSER")
    assert supervisor.name == "MasterSupervisorAgent"
    assert supervisor.strategy_mode == "HIGH_CONVERSION_CLOSER"
    assert "Kabir" in supervisor.system_prompt
    assert "High-Conversion Closer" in supervisor.system_prompt
    assert "consult_itinerary" in supervisor.allowed_tool_names
    assert "calculate_group_pricing" in supervisor.allowed_tool_names
    assert "generate_payment_link" in supervisor.allowed_tool_names
    assert "escalate_to_human" in supervisor.allowed_tool_names


def test_strategy_switching():
    supervisor = create_master_supervisor(strategy_mode="HIGH_CONVERSION_CLOSER")

    # Switch to Consultative Guide
    supervisor.set_strategy("CONSULTATIVE_GUIDE")
    assert supervisor.strategy_mode == "CONSULTATIVE_GUIDE"
    assert "Consultative Guide" in supervisor.system_prompt
    assert "advisory posture" in supervisor.system_prompt

    # Switch to Strict Margin Protector
    supervisor.set_strategy("STRICT_MARGIN_PROTECTOR")
    assert supervisor.strategy_mode == "STRICT_MARGIN_PROTECTOR"
    assert "Strict Margin Protector" in supervisor.system_prompt
    assert "margin protection" in supervisor.system_prompt


def test_delegation_tools():
    # 1. Itinerary delegation
    itin_tool = ConsultItineraryTool()
    res1 = itin_tool.run(destination="Pondicherry")
    assert "7,499" in res1.output
    assert "Pondicherry" in res1.output

    # 2. Pricing delegation with 6 pax (5% tier discount)
    pricing_tool = CalculatePricingTool()
    res2 = pricing_tool.run(destination="Pondicherry", group_size=6, promo_code="TREK500")
    assert res2.success is True
    assert res2.metadata["tier_discount_percent"] == 5
    assert res2.metadata["promo_discount_amount"] == 3000  # ₹500 x 6 pax
    assert res2.metadata["total_advance_required"] == 12000  # 6 pax x 2000

    # 3. Payment link delegation
    pay_tool = GeneratePaymentDelegationTool()
    res3 = pay_tool.run(
        customer_name="Rahul Verma",
        phone_number="919876543210",
        amount=12000,
        trip_name="Pondicherry Weekend Trip"
    )
    assert res3.success is True
    assert "https://rzp.io/l/" in res3.metadata["payment_url"]

    # 4. WhatsApp delegation
    wa_tool = DispatchWhatsAppDelegationTool()
    res4 = wa_tool.run(
        phone_number="919876543210",
        message_text="Hey Rahul! Here is your Pondicherry itinerary."
    )
    assert res4.success is True
    assert res4.metadata["phone"] == "919876543210"

    # 5. Escalate to Human (HITL)
    hitl_tool = EscalateToHumanTool()
    res5 = hitl_tool.run(
        reason="Customer requests 25% discount for 30 college students",
        priority="URGENT",
        traveler_details={"lead": "Rahul Verma", "group_size": 30}
    )
    assert res5.success is True
    assert res5.metadata["escalated"] is True
    assert res5.metadata["priority"] == "URGENT"


def test_margin_guardrail_enforcement():
    supervisor = create_master_supervisor()

    # 15% discount -> Compliant
    check1 = supervisor.evaluate_margin_guardrail(15.0)
    assert check1["compliant"] is True
    assert check1["applied_discount"] == 15.0

    # 25% discount -> Exceeds guardrail, capped at 20.0%
    check2 = supervisor.evaluate_margin_guardrail(25.0)
    assert check2["compliant"] is False
    assert check2["applied_discount"] == 20.0
    assert "Capped at 20%" in check2["reason"]


def test_agent_factory_master_agent():
    agent = AgentFactory.create("master_agent", strategy_mode="HIGH_CONVERSION_CLOSER")
    assert isinstance(agent, MasterSupervisorAgent)
    assert "consult_itinerary" in agent.allowed_tool_names
    assert "calculate_group_pricing" in agent.allowed_tool_names
    assert agent.strategy_mode == "HIGH_CONVERSION_CLOSER"
