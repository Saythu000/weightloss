"""
Master Sales Supervisor Agent ("Kabir")
Agent #0: Orchestrator-Workers Architecture for Trekatour Sales Workforce.
"""

from __future__ import annotations
import logging
from typing import AsyncGenerator, Optional, Any, List, Dict
from agent.agent import Agent
from agent.events import AgentEvent
from agent.session import SessionContext
from client.llm_client import AsyncLLMClient
from customagents.masteragent.prompts import get_master_prompt, STRATEGY_PRESETS
from customagents.masteragent.tools import (
    ConsultItineraryTool,
    CalculatePricingTool,
    GeneratePaymentDelegationTool,
    DispatchWhatsAppDelegationTool,
    EscalateToHumanTool,
)

logger = logging.getLogger("Trekatour.MasterSupervisorAgent")


class MasterSupervisorAgent(Agent):
    """
    Agent #0: Kabir - Head of Autonomous Travel Sales & Supervisor.
    Orchestrates the 7 specialized worker agents using dynamic tool delegation.
    """

    DEFAULT_ALLOWED_TOOLS = [
        "consult_itinerary",
        "calculate_group_pricing",
        "generate_payment_link",
        "dispatch_whatsapp_message",
        "escalate_to_human",
        "get_customer_memory",
        "log_lead_status",
    ]

    def __init__(
        self,
        llm_client: Optional[AsyncLLMClient] = None,
        config: Optional[Any] = None,
        strategy_mode: str = "HIGH_CONVERSION_CLOSER",
        custom_system_prompt: Optional[str] = None,
        allowed_tool_names: Optional[List[str]] = None,
        session: Optional[SessionContext] = None,
    ):
        self.strategy_mode = strategy_mode
        prompt = custom_system_prompt or get_master_prompt(strategy_mode)
        tools = allowed_tool_names or self.DEFAULT_ALLOWED_TOOLS

        super().__init__(
            name="MasterSupervisorAgent",
            system_prompt=prompt,
            allowed_tool_names=tools,
            llm_client=llm_client or AsyncLLMClient(),
            config=config,
        )
        self.system_prompt = prompt
        self.session = session or SessionContext(session_id="master_supervisor_session")

        # Register Master Delegation Tools in the agent's ToolRegistry
        self._register_master_tools()

    def _register_master_tools(self):
        """Registers the 5 sub-agent delegation tools into the tool registry."""
        tools_to_register = [
            ConsultItineraryTool(),
            CalculatePricingTool(),
            GeneratePaymentDelegationTool(),
            DispatchWhatsAppDelegationTool(),
            EscalateToHumanTool(),
        ]
        for t in tools_to_register:
            self.tool_registry.register(t)

    def set_strategy(self, strategy_mode: str):
        """Dynamically reconfigures the sales strategy mode in real time."""
        if strategy_mode in STRATEGY_PRESETS:
            self.strategy_mode = strategy_mode
            new_prompt = get_master_prompt(strategy_mode)
            self.system_prompt = new_prompt
            self.context_manager.system_prompt = new_prompt
            logger.info(f"[MasterSupervisorAgent] Strategy switched to: {strategy_mode}")

    def evaluate_margin_guardrail(self, discount_percent: float) -> Dict[str, Any]:
        """Enforces the 20% maximum discount margin guardrail."""
        if discount_percent > 20.0:
            return {
                "compliant": False,
                "applied_discount": 20.0,
                "excess": discount_percent - 20.0,
                "reason": "Exceeds 20% maximum agency margin guardrail. Capped at 20%.",
            }
        return {
            "compliant": True,
            "applied_discount": discount_percent,
            "excess": 0.0,
            "reason": "Compliant with agency profitability policy.",
        }

    async def run(
        self,
        user_prompt: str,
        session: Optional[SessionContext] = None,
        force_tool_choice: Optional[str] = None,
    ) -> AsyncGenerator[AgentEvent, None]:
        """Executes multi-agent orchestrator loop."""
        target_session = session or self.session
        async for event in super().run(
            user_prompt=user_prompt,
            session=target_session,
            force_tool_choice=force_tool_choice,
        ):
            yield event


SupervisorAgent = MasterSupervisorAgent


def create_master_supervisor(
    llm_client: Optional[AsyncLLMClient] = None,
    config: Optional[Any] = None,
    strategy_mode: str = "HIGH_CONVERSION_CLOSER",
    session: Optional[SessionContext] = None,
) -> MasterSupervisorAgent:
    """Factory helper for instantiating Agent #0 (Kabir)."""
    return MasterSupervisorAgent(
        llm_client=llm_client,
        config=config,
        strategy_mode=strategy_mode,
        session=session,
    )
