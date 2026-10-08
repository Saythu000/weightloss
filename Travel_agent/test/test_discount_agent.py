"""
Unit Tests for Agent 4: Discount & Pricing Agent (Priya)
"""

import pytest
from customagents.discountcalculatoragent.calculator import (
    compute_trip_quote,
    get_group_discount_tier,
    MAX_MARGIN_DISCOUNT_PERCENT,
)
from customagents.discountcalculatoragent.agent import DiscountCalculatorAgent, create_discount_agent
from customagents.factory import AgentFactory
from tools.builtin.pricing_tool import PricingCalculatorTool


def test_group_discount_tiers():
    assert get_group_discount_tier(1) == 0.0
    assert get_group_discount_tier(3) == 0.0
    assert get_group_discount_tier(4) == 5.0
    assert get_group_discount_tier(7) == 5.0
    assert get_group_discount_tier(8) == 10.0
    assert get_group_discount_tier(15) == 10.0
    assert get_group_discount_tier(16) == 15.0
    assert get_group_discount_tier(25) == 15.0


def test_standard_quote_1_pax():
    quote = compute_trip_quote(
        base_price_per_person=7499,
        group_size=1,
        destination="Pondicherry",
        customer_name="Solo Traveler",
    )
    assert quote["subtotal"] == 7499
    assert quote["tier_discount_percent"] == 0.0
    assert quote["total_discount_amount"] == 0
    assert quote["final_total"] == 7499
    assert quote["total_advance_required"] == 2000
    assert quote["balance_due_at_boarding"] == 5499


def test_group_quote_4_pax_tier_discount():
    # 4 pax @ 7499 = 29,996. 5% discount = 1499.8 -> 1500
    quote = compute_trip_quote(
        base_price_per_person=7499,
        group_size=4,
        destination="Pondicherry",
        customer_name="Sneha Rao",
    )
    assert quote["subtotal"] == 29996
    assert quote["tier_discount_percent"] == 5.0
    assert quote["tier_discount_amount"] == 1500
    assert quote["final_total"] == 28496
    assert quote["total_advance_required"] == 8000
    assert quote["balance_due_at_boarding"] == 20496
    assert "Sneha Rao" in quote["whatsapp_message"]


def test_promo_code_and_margin_guardrail():
    # Promo code TREK500 = 500 * 4 = 2000 off + 1500 tier = 3500 off
    quote = compute_trip_quote(
        base_price_per_person=7499,
        group_size=4,
        promo_code="TREK500",
    )
    assert quote["applied_promo_code"] == "TREK500"
    assert quote["promo_discount_amount"] == 2000
    assert quote["total_discount_amount"] == 3500
    assert quote["final_total"] == 26496

    # Test extreme promo exceeding 20% cap
    subtotal = 10000 * 1
    # 20% of 10000 = 2000 max allowed
    capped_quote = compute_trip_quote(
        base_price_per_person=10000,
        group_size=1,
        promo_code="TREK1000",
    )
    assert capped_quote["total_discount_amount"] <= (MAX_MARGIN_DISCOUNT_PERCENT / 100.0) * subtotal


def test_pricing_calculator_tool():
    tool = PricingCalculatorTool()
    res = tool.run(base_price_per_person=5499, group_size=6, destination="Gokarna")
    assert res.success is True
    assert "Group Discount (5.0%)" in res.output
    assert res.metadata["quote"]["final_total"] > 0


def test_discount_agent_factory():
    agent = AgentFactory.create_agent("discount_agent")
    assert isinstance(agent, DiscountCalculatorAgent)
    assert "calculate_pricing" in agent.allowed_tool_names
