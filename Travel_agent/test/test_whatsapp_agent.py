"""
Unit Tests for Agent 5: WhatsApp Outreach Agent (Sameer)
"""

import pytest
from customagents.whatsappoutreachagent.agent import WhatsAppOutreachAgent, create_whatsapp_agent
from customagents.whatsappoutreachagent.tools import SendTextMessageTool, SendItineraryPdfTool
from customagents.factory import AgentFactory


def test_compose_brochure_package():
    agent = create_whatsapp_agent()

    profile = {
        "customer_name": "Sneha Rao",
        "destination": "Pondicherry",
        "group_size": 4,
        "phoneNumber": "919876543210",
    }
    itinerary = {
        "packageName": "2N/3D Pondicherry & Pichavaram Mangroves",
        "duration": "2 Nights / 3 Days",
        "departureCity": "Hyderabad",
    }
    quote = {
        "subtotal": 29996,
        "total_discount_amount": 3500,
        "final_total": 26496,
        "per_person_effective": 6624,
        "total_advance_required": 8000,
        "balance_due_at_boarding": 18496,
    }

    pkg = agent.compose_brochure_package(profile, itinerary, quote)

    assert pkg["recipient_phone"] == "919876543210"
    assert pkg["destination"] == "Pondicherry"
    assert "https://trekatour.in/brochures/pondicherry-itinerary.pdf" in pkg["pdf_url"]
    assert "Sneha Rao" in pkg["message_text"]
    assert "₹26,496" in pkg["message_text"]
    assert "₹8,000" in pkg["message_text"]
    assert "LOCK SEATS" in pkg["message_text"]


def test_compose_followup_messages():
    agent = create_whatsapp_agent()

    profile = {
        "customer_name": "Sneha Rao",
        "destination": "Pondicherry",
        "group_size": 4,
    }

    nudge_2h = agent.compose_followup_message(profile, followup_type="2_HOUR_NUDGE")
    assert "Sneha Rao" in nudge_2h
    assert "Pondicherry" in nudge_2h
    assert "6 seats remaining" in nudge_2h

    warning_24h = agent.compose_followup_message(profile, followup_type="24_HOUR_WARNING")
    assert "Sneha Rao" in warning_24h
    assert "cutoff" in warning_24h


def test_whatsapp_tools():
    txt_tool = SendTextMessageTool()
    res1 = txt_tool.run(phone_number="+91 98765-43210", message="Hello from Trekatour!")
    assert res1.success is True
    assert "919876543210" in res1.output

    pdf_tool = SendItineraryPdfTool()
    res2 = pdf_tool.run(phone_number="919876543210", destination="Gokarna")
    assert res2.success is True
    assert "gokarna-itinerary.pdf" in res2.output


def test_whatsapp_agent_factory():
    agent = AgentFactory.create_agent("whatsapp_agent")
    assert isinstance(agent, WhatsAppOutreachAgent)
    assert "send_whatsapp_message" in agent.allowed_tool_names
    assert "send_whatsapp_itinerary_pdf" in agent.allowed_tool_names
