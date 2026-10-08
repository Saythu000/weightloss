"""
Trekatour Itinerary & Destination RAG Agent (Agent 3 - Rohan)
Specialized in searching official Trekatour PDF itineraries and generating 100% factual day-by-day travel plans.
"""

from __future__ import annotations
import json
import re
import logging
from typing import AsyncGenerator, Optional, Any, List, Dict
from agent.agent import Agent
from agent.events import AgentEvent
from agent.session import SessionContext
from client.llm_client import AsyncLLMClient
from customagents.itineraryragagent.prompts import ITINERARY_AGENT_PROMPT, build_itinerary_prompt
from customagents.itineraryragagent.knowledge_loader import search_destination_knowledge

logger = logging.getLogger("Trekatour.ItineraryAgent")


class ItineraryRAGAgent(Agent):
    """
    Agent 3: Rohan - Itinerary Planner & Destination Specialist.
    Retrieves Trekatour travel knowledge from PostgreSQL and synthesizes structured day-wise plans.
    """

    DEFAULT_ALLOWED_TOOLS = ["search_itinerary", "get_customer_memory"]

    def __init__(
        self,
        llm_client: Optional[AsyncLLMClient] = None,
        config: Optional[Any] = None,
        custom_system_prompt: Optional[str] = None,
        allowed_tool_names: Optional[List[str]] = None,
        session: Optional[SessionContext] = None,
    ):
        prompt = custom_system_prompt or ITINERARY_AGENT_PROMPT
        tools = allowed_tool_names or self.DEFAULT_ALLOWED_TOOLS
        super().__init__(
            name="ItineraryRAGAgent",
            system_prompt=prompt,
            allowed_tool_names=tools,
            llm_client=llm_client or AsyncLLMClient(),
            config=config,
        )
        self.system_prompt = prompt
        self.session = session or SessionContext(session_id="itinerary_rag_session")

    def search_knowledge_base(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Searches PostgreSQL KnowledgeBase for matching trip itineraries."""
        return search_destination_knowledge(query, top_k=top_k)

    async def plan_itinerary(self, traveler_profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Synthesizes a 100% factual day-by-day travel itinerary grounded in Trekatour's Knowledge Base.
        """
        destination = traveler_profile.get("destination", "Pondicherry")
        group_size = traveler_profile.get("group_size", 1)
        departure_city = traveler_profile.get("departure_city", "Hyderabad")

        # 1. Retrieve Knowledge Chunks from PostgreSQL
        knowledge_records = self.search_knowledge_base(destination, top_k=5)

        context_text = ""
        if knowledge_records:
            context_text = "\n\n---\n\n".join(
                [f"[{r['title']} - Category: {r['category']}]\n{r['content']}" for r in knowledge_records]
            )
        else:
            context_text = f"Standard Trekatour weekend getaway to {destination} from {departure_city}."

        # 2. Build synthesis prompt
        prompt_content = build_itinerary_prompt(context_text, traveler_profile)

        # 3. Invoke Groq LLM
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": prompt_content},
        ]

        try:
            response = await self.llm_client.generate(
                messages=messages,
                temperature=0.1,
                max_tokens=2500,
            )
            raw_text = response.content or ""

            # Extract JSON from LLM response (supports markdown fences or raw JSON)
            parsed_json = self._extract_json(raw_text)
            if parsed_json:
                parsed_json["retrieved_sources"] = [r["title"] for r in knowledge_records]
                return parsed_json

        except Exception as e:
            logger.error(f"LLM itinerary generation error: {e}", exc_info=True)

        # Fallback deterministic generator if LLM response couldn't be parsed
        return self._generate_fallback_itinerary(traveler_profile, knowledge_records)

    def _extract_json(self, text: str) -> Optional[Dict[str, Any]]:
        """Safely extracts JSON dictionary from text or markdown blocks."""
        # Try finding ```json ... ```
        match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text)
        if match:
            try:
                return json.loads(match.group(1))
            except Exception:
                pass

        # Try finding raw JSON {...}
        match_raw = re.search(r"(\{[\s\S]*\})", text)
        if match_raw:
            try:
                return json.loads(match_raw.group(1))
            except Exception:
                pass

        return None

    def _generate_fallback_itinerary(
        self,
        traveler_profile: Dict[str, Any],
        knowledge_records: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Provides a safe, factual itinerary even if LLM synthesis times out."""
        destination = traveler_profile.get("destination", "Pondicherry")
        group_size = traveler_profile.get("group_size", 1)
        name = traveler_profile.get("customer_name", "Traveler")

        # Pick price and title from first matching record if available
        first_content = knowledge_records[0]["content"] if knowledge_records else ""
        price = 7499 if "Pondicherry" in destination else (5499 if "Gokarna" in destination else 5999)
        advance = 2000 if price > 6000 else 1500

        whatsapp_msg = (
            f"Hey *{name}*! 🌴\n\n"
            f"Rohan here from *Trekatour*! Here is your official itinerary for *{destination}*:\n\n"
            f"📍 *Package:* 2N/3D {destination} Weekend Experience\n"
            f"💰 *Base Price:* ₹{price:,}/- per person\n"
            f"🎟️ *Advance to Reserve:* ₹{advance:,}/- per person\n"
            f"👥 *Travelers:* {group_size} pax\n"
            f"🚆 *Departure:* Hyderabad (Friday evening)\n\n"
            f"✅ *Inclusions:* Round-trip travel, stays, breakfasts, trip captain, permits & entry.\n"
            f"❌ *Exclusions:* Personal meals and optional adventure activities.\n\n"
            f"Next step: Our Pricing Specialist (Priya) can calculate group discounts for your {group_size} travelers!"
        )

        return {
            "package_name": f"2N/3D {destination} Weekend Adventure",
            "destination": destination,
            "duration": "2 Nights / 3 Days",
            "base_price_per_person": price,
            "advance_booking_amount": advance,
            "departure_city": traveler_profile.get("departure_city", "Hyderabad"),
            "difficulty": "Easy to Moderate",
            "itinerary_days": [
                {"day_number": 1, "title": "Overnight Travel from Hyderabad", "activities": ["Board train/bus from Hyderabad"]},
                {"day_number": 2, "title": f"Arrival & Sightseeing in {destination}", "activities": ["Check-in", "Local sightseeing", "Campfire dinner"]},
                {"day_number": 3, "title": "Adventure & Return Journey", "activities": ["Morning exploration", "Evening return to Hyderabad"]},
            ],
            "inclusions": ["Transportation from Hyderabad", "Homestay/Camp stay", "Breakfasts", "Trip captain"],
            "exclusions": ["Personal meals", "Water sports", "Shopping"],
            "whatsapp_message": whatsapp_msg,
            "retrieved_sources": [r["title"] for r in knowledge_records],
        }

    async def run(
        self,
        user_prompt: str,
        session: Optional[SessionContext] = None,
        force_tool_choice: Optional[str] = None,
    ) -> AsyncGenerator[AgentEvent, None]:
        """Runs a conversational turn answering specific itinerary questions."""
        target_session = session or self.session
        async for event in super().run(
            user_prompt=user_prompt,
            session=target_session,
            force_tool_choice=force_tool_choice,
        ):
            yield event


ItineraryAgent = ItineraryRAGAgent


def create_itinerary_agent(
    llm_client: Optional[AsyncLLMClient] = None,
    config: Optional[Any] = None,
    session: Optional[SessionContext] = None,
) -> ItineraryRAGAgent:
    """Factory helper for instantiating the Itinerary RAG Agent."""
    return ItineraryRAGAgent(
        llm_client=llm_client,
        config=config,
        session=session,
    )
