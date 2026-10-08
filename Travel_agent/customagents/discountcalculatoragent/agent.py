"""
Trekatour Dynamic Pricing & Group Discount Agent (Agent 4 - Priya)
Specialized in calculating volume tier discounts, promo codes, margin guardrails, and payment schedules.
"""

from __future__ import annotations
import logging
from typing import AsyncGenerator, Optional, Any, List, Dict
from agent.agent import Agent
from agent.events import AgentEvent
from agent.session import SessionContext
from client.llm_client import AsyncLLMClient
from customagents.discountcalculatoragent.prompts import DISCOUNT_AGENT_PROMPT
from customagents.discountcalculatoragent.calculator import compute_trip_quote
from tools.builtin.pricing_tool import PricingCalculatorTool

logger = logging.getLogger("Trekatour.DiscountAgent")


class DiscountCalculatorAgent(Agent):
    """
    Agent 4: Priya - Dynamic Pricing & Group Discount Specialist.
    Computes verified quotes, applies tiered group discounts, and enforces profit margin guardrails.
    """

    DEFAULT_ALLOWED_TOOLS = ["calculate_pricing"]

    def __init__(
        self,
        llm_client: Optional[AsyncLLMClient] = None,
        config: Optional[Any] = None,
        custom_system_prompt: Optional[str] = None,
        allowed_tool_names: Optional[List[str]] = None,
        session: Optional[SessionContext] = None,
    ):
        prompt = custom_system_prompt or DISCOUNT_AGENT_PROMPT
        tools = allowed_tool_names or self.DEFAULT_ALLOWED_TOOLS
        super().__init__(
            name="DiscountCalculatorAgent",
            system_prompt=prompt,
            allowed_tool_names=tools,
            llm_client=llm_client or AsyncLLMClient(),
            config=config,
        )
        self.system_prompt = prompt
        self.session = session or SessionContext(session_id="discount_calculator_session")

        # Ensure calculate_pricing tool is registered
        if not self.tool_registry.get("calculate_pricing"):
            self.tool_registry.register(PricingCalculatorTool())

    def calculate_quote(
        self,
        base_price_per_person: float,
        group_size: int = 1,
        advance_per_person: Optional[float] = None,
        promo_code: Optional[str] = None,
        destination: str = "Pondicherry",
        customer_name: str = "Traveler",
    ) -> Dict[str, Any]:
        """
        Directly computes the verified pricing quote with mathematical precision.
        """
        return compute_trip_quote(
            base_price_per_person=base_price_per_person,
            group_size=group_size,
            advance_per_person=advance_per_person,
            promo_code=promo_code,
            destination=destination,
            customer_name=customer_name,
        )

    async def run(
        self,
        user_prompt: str,
        session: Optional[SessionContext] = None,
        force_tool_choice: Optional[str] = None,
    ) -> AsyncGenerator[AgentEvent, None]:
        """Runs a conversational turn answering pricing and discount questions."""
        target_session = session or self.session
        async for event in super().run(
            user_prompt=user_prompt,
            session=target_session,
            force_tool_choice=force_tool_choice,
        ):
            yield event


DiscountAgent = DiscountCalculatorAgent


def create_discount_agent(
    llm_client: Optional[AsyncLLMClient] = None,
    config: Optional[Any] = None,
    session: Optional[SessionContext] = None,
) -> DiscountCalculatorAgent:
    """Factory helper for instantiating the Discount Calculator Agent."""
    return DiscountCalculatorAgent(
        llm_client=llm_client,
        config=config,
        session=session,
    )
