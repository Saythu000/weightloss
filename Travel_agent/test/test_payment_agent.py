"""
Unit Tests for Agent 6: Payment & Voucher Agent (Arjun)
"""

import pytest
from customagents.paymentagent.agent import PaymentVoucherAgent, create_payment_agent
from customagents.paymentagent.tools import GeneratePaymentLinkTool, IssueBookingVoucherTool
from customagents.factory import AgentFactory


def test_create_payment_link():
    agent = create_payment_agent()

    profile = {
        "customer_name": "Sneha Rao",
        "phoneNumber": "919876543210",
        "destination": "Pondicherry",
        "total_advance_required": 8000,
    }

    link_data = agent.create_payment_link(profile)

    assert link_data["amount"] == 8000
    assert "https://rzp.io/l/" in link_data["payment_url"]
    assert "Sneha Rao" in link_data["whatsapp_message"]
    assert "₹8,000" in link_data["whatsapp_message"]
    assert "Pondicherry" in link_data["whatsapp_message"]


def test_issue_booking_voucher():
    agent = create_payment_agent()

    profile = {
        "customer_name": "Sneha Rao",
        "destination": "Pondicherry",
        "group_size": 4,
        "total_advance_required": 8000,
        "balance_due_at_boarding": 18496,
        "departure_city": "Hyderabad",
    }

    voucher = agent.issue_voucher(profile, payment_id="pay_live_992288")

    assert voucher["status"] == "CONFIRMED"
    assert "TK-2026-" in voucher["booking_reference"]
    assert voucher["payment_id"] == "pay_live_992288"
    assert voucher["advance_paid"] == 8000
    assert voucher["balance_due_at_boarding"] == 18496
    assert "BOOKING CONFIRMED" in voucher["whatsapp_message"]
    assert "Sneha Rao" in voucher["whatsapp_message"]


def test_payment_tools():
    gen_tool = GeneratePaymentLinkTool()
    res1 = gen_tool.run(
        customer_name="Vikram Patel",
        phone_number="919876543210",
        amount=5000,
        trip_name="Gokarna Beach Trek",
    )
    assert res1.success is True
    assert "https://rzp.io/l/" in res1.metadata["payment_url"]

    voucher_tool = IssueBookingVoucherTool()
    res2 = voucher_tool.run(
        customer_name="Vikram Patel",
        destination="Gokarna",
        group_size=2,
        advance_paid=3000,
        balance_due=7998,
        departure_city="Hyderabad",
    )
    assert res2.success is True
    assert "TK-2026-GOKAR" in res2.metadata["booking_reference"]


def test_payment_agent_factory():
    agent = AgentFactory.create_agent("payment_agent")
    assert isinstance(agent, PaymentVoucherAgent)
    assert "generate_payment_link" in agent.allowed_tool_names
    assert "issue_booking_voucher" in agent.allowed_tool_names
