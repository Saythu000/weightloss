"""
Trekatour Agent Factory Module
Instantiates specialized sub-agents with strict system prompt scoping and restricted allowed_tool_names.
"""

from typing import Dict, Any, List, Optional
import logging
from agent.agent import Agent
from client.llm_client import AsyncLLMClient
from config.config import AgenticConfig
from prompts.system import get_system_prompt

logger = logging.getLogger("Trekatour.CustomAgents.Factory")

# Predefined Sub-Agent Tool White-lists
AGENT_TOOL_PERMISSIONS: Dict[str, List[str]] = {
    "voice_agent": ["log_lead_status", "search_itinerary", "calculate_pricing", "escalate_to_human"],
    "intake_agent": ["log_lead_status", "save_customer_memory", "get_customer_memory"],
    "itinerary_agent": ["search_itinerary", "get_customer_memory"],
    "discount_agent": ["calculate_pricing"],
    "whatsapp_agent": ["send_whatsapp_message", "send_whatsapp_itinerary_pdf", "log_lead_status"],
    "payment_agent": ["generate_payment_link", "issue_booking_voucher", "log_lead_status"],
    "summary_agent": ["get_customer_memory", "log_lead_status"],
    "master_agent": [
        "consult_itinerary",
        "calculate_group_pricing",
        "generate_payment_link",
        "dispatch_whatsapp_message",
        "escalate_to_human",
        "get_customer_memory",
        "log_lead_status",
    ],
    "supervisor_agent": [
        "consult_itinerary",
        "calculate_group_pricing",
        "generate_payment_link",
        "dispatch_whatsapp_message",
        "escalate_to_human",
        "get_customer_memory",
        "log_lead_status",
    ],
}


class AgentFactory:
    """
    Factory for instantiating specialized Trekatour Sub-Agents.
    """

    @classmethod
    def create_agent(
        cls,
        agent_type: str,
        llm_client: Optional[AsyncLLMClient] = None,
        config: Optional[AgenticConfig] = None,
        custom_system_prompt: Optional[str] = None,
        domain_profile: Optional[Any] = None,
        **kwargs: Any,
    ) -> Agent:
        agent_type_clean = agent_type.lower().strip()
        if agent_type_clean == "doc_rag":
            agent_type_clean = "itinerary_agent"

        llm = llm_client or AsyncLLMClient()
        allowed_tools = AGENT_TOOL_PERMISSIONS.get(agent_type_clean, None)

        system_prompt = custom_system_prompt or get_system_prompt(role_name=agent_type_clean.title())
        if domain_profile and hasattr(domain_profile, "persona_role"):
            system_prompt += f"\nPersona: {domain_profile.persona_role} ({domain_profile.company_name})"

        if agent_type_clean == "voice_agent":
            from customagents.voiceagent.prompts import VOICE_AGENT_PROMPT
            from customagents.voiceagent.agent import VoiceSalesAgent
            return VoiceSalesAgent(
                llm_client=llm,
                config=config,
                custom_system_prompt=custom_system_prompt or VOICE_AGENT_PROMPT,
                allowed_tool_names=allowed_tools,
            )

        if agent_type_clean == "itinerary_agent":
            from customagents.itineraryragagent.prompts import ITINERARY_AGENT_PROMPT
            from customagents.itineraryragagent.agent import ItineraryRAGAgent
            return ItineraryRAGAgent(
                llm_client=llm,
                config=config,
                custom_system_prompt=custom_system_prompt or ITINERARY_AGENT_PROMPT,
                allowed_tool_names=allowed_tools,
            )

        if agent_type_clean == "discount_agent":
            from customagents.discountcalculatoragent.prompts import DISCOUNT_AGENT_PROMPT
            from customagents.discountcalculatoragent.agent import DiscountCalculatorAgent
            return DiscountCalculatorAgent(
                llm_client=llm,
                config=config,
                custom_system_prompt=custom_system_prompt or DISCOUNT_AGENT_PROMPT,
                allowed_tool_names=allowed_tools,
            )

        if agent_type_clean == "whatsapp_agent":
            from customagents.whatsappoutreachagent.prompts import WHATSAPP_AGENT_PROMPT
            from customagents.whatsappoutreachagent.agent import WhatsAppOutreachAgent
            return WhatsAppOutreachAgent(
                llm_client=llm,
                config=config,
                custom_system_prompt=custom_system_prompt or WHATSAPP_AGENT_PROMPT,
                allowed_tool_names=allowed_tools,
            )

        if agent_type_clean == "payment_agent":
            from customagents.paymentagent.prompts import PAYMENT_AGENT_PROMPT
            from customagents.paymentagent.agent import PaymentVoucherAgent
            return PaymentVoucherAgent(
                llm_client=llm,
                config=config,
                custom_system_prompt=custom_system_prompt or PAYMENT_AGENT_PROMPT,
                allowed_tool_names=allowed_tools,
            )

        if agent_type_clean == "summary_agent":
            from customagents.summaryreportagent.prompts import SUMMARY_AGENT_PROMPT
            from customagents.summaryreportagent.agent import SummaryReportAgent
            return SummaryReportAgent(
                llm_client=llm,
                config=config,
                custom_system_prompt=custom_system_prompt or SUMMARY_AGENT_PROMPT,
                allowed_tool_names=allowed_tools,
            )

        if agent_type_clean in ("master_agent", "supervisor_agent"):
            from customagents.masteragent.prompts import get_master_prompt
            from customagents.masteragent.supervisor import MasterSupervisorAgent
            strategy = kwargs.get("strategy_mode", "HIGH_CONVERSION_CLOSER")
            return MasterSupervisorAgent(
                llm_client=llm,
                config=config,
                strategy_mode=strategy,
                custom_system_prompt=custom_system_prompt or get_master_prompt(strategy),
                allowed_tool_names=allowed_tools,
            )

        agent = Agent(
            llm_client=llm,
            system_prompt=system_prompt,
            config=config,
            allowed_tool_names=allowed_tools,
        )

        logger.info(
            f"Created Agent '{agent_type_clean}' with allowed tools: {allowed_tools or 'ALL'}"
        )
        return agent

    @classmethod
    def create(cls, agent_type: str, config: Optional[Any] = None, session: Optional[Any] = None, **kwargs: Any) -> Agent:
        """
        Colleague refactoragent-master Factory Method compatibility alias:
        AgentFactory.create(agent_type, config, session)
        """
        return cls.create_agent(agent_type=agent_type, config=config, session=session, **kwargs)

