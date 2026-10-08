"""
Autonomous Voice Sales Agent Module
Equipped with itinerary search, pricing calculation, lead status logging, and human escalation.
"""

from __future__ import annotations
from typing import AsyncGenerator, Optional, Any, List
import logging
from agent.agent import Agent
from agent.events import AgentEvent, EventType
from agent.session import SessionContext
from client.llm_client import AsyncLLMClient
from customagents.voiceagent.prompts import VOICE_AGENT_PROMPT

logger = logging.getLogger("Trekatour.VoiceAgent")


class VoiceSalesAgent(Agent):
    """
    Autonomous Voice Sales Agent for outbound calling & inbound call triage.
    Specialized in conversational phone dialogue, BANT lead qualification,
    pricing negotiation, and automated CRM status logging.
    """

    DEFAULT_ALLOWED_TOOLS = [
        "log_lead_status",
        "search_itinerary",
        "calculate_pricing",
        "escalate_to_human",
    ]

    def __init__(
        self,
        llm_client: Optional[AsyncLLMClient] = None,
        config: Optional[Any] = None,
        custom_system_prompt: Optional[str] = None,
        allowed_tool_names: Optional[List[str]] = None,
        session: Optional[SessionContext] = None,
    ):
        prompt = custom_system_prompt or VOICE_AGENT_PROMPT
        tools = allowed_tool_names or self.DEFAULT_ALLOWED_TOOLS
        super().__init__(
            name="VoiceSalesAgent",
            system_prompt=prompt,
            allowed_tool_names=tools,
            llm_client=llm_client or AsyncLLMClient(),
            config=config,
        )
        self.session = session or SessionContext(session_id="voice_sales_session")

    async def run(
        self,
        transcript: str,
        session: Optional[SessionContext] = None,
        force_tool_choice: Optional[str] = None
    ) -> AsyncGenerator[AgentEvent, None]:
        """Runs one conversational turn on the user's spoken transcript."""
        target_session = session or self.session

        async for event in super().run(
            user_prompt=transcript,
            session=target_session,
            force_tool_choice=force_tool_choice
        ):
            yield event


VoiceAgent = VoiceSalesAgent


def create_voice_agent(
    llm_client: Optional[AsyncLLMClient] = None,
    config: Optional[Any] = None,
    session: Optional[SessionContext] = None,
) -> VoiceSalesAgent:
    """Factory helper for instantiating the Voice Sales Agent."""
    return VoiceSalesAgent(
        llm_client=llm_client,
        config=config,
        session=session,
    )
