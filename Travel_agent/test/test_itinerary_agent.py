"""
Unit Tests for Agent 3: Itinerary Planner Agent (Rohan)
"""

import asyncio
from customagents.itineraryragagent.knowledge_loader import search_destination_knowledge
from customagents.itineraryragagent.agent import ItineraryRAGAgent, create_itinerary_agent
from customagents.factory import AgentFactory


def test_destination_knowledge_retrieval():
    """Verifies that RAG search retrieves official Trekatour packages from PostgreSQL."""
    pondy_records = search_destination_knowledge("Pondicherry", top_k=3)
    assert len(pondy_records) > 0
    assert any("Pondicherry" in r["title"] or "Pondicherry" in r["content"] for r in pondy_records)

    gokarna_records = search_destination_knowledge("Gokarna", top_k=2)
    assert len(gokarna_records) > 0
    assert any("Gokarna" in r["title"] for r in gokarna_records)


def test_agent_factory_instantiation():
    """Verifies that AgentFactory returns ItineraryRAGAgent for 'itinerary_agent'."""
    agent = AgentFactory.create_agent("itinerary_agent")
    assert isinstance(agent, ItineraryRAGAgent)
    assert "search_itinerary" in agent.allowed_tool_names


def test_itinerary_plan_generation():
    """Verifies that plan_itinerary creates a factual structured itinerary matching Trekatour details."""
    async def _run():
        agent = create_itinerary_agent()

        profile = {
            "customer_name": "Rahul Sharma",
            "destination": "Pondicherry",
            "group_size": 4,
            "departure_city": "Hyderabad",
            "travel_dates": "Next Weekend",
            "trip_style": "Beach & Leisure",
        }

        result = await agent.plan_itinerary(profile)

        assert result is not None
        assert "Pondicherry" in result.get("destination", "")
        assert result.get("base_price_per_person") == 7499
        assert result.get("advance_booking_amount") == 2000
        assert len(result.get("itinerary_days", [])) >= 2
        assert len(result.get("inclusions", [])) >= 2
        assert "whatsapp_message" in result
        assert len(result["whatsapp_message"]) > 30
        assert "7,499" in result["whatsapp_message"] or "Pondicherry" in result["whatsapp_message"]

    asyncio.run(_run())
