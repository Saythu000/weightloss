"""
Trekatour Summary & Sales Analytics Agent (Agent 7 - Neha)
Specialized in conversation history synthesis, lead purchase intent scoring, and executive CRM reporting.
"""

from __future__ import annotations
import logging
from typing import AsyncGenerator, Optional, Any, List, Dict
from agent.agent import Agent
from agent.events import AgentEvent
from agent.session import SessionContext
from client.llm_client import AsyncLLMClient
from customagents.summaryreportagent.prompts import SUMMARY_AGENT_PROMPT
from customagents.summaryreportagent.analytics import (
    calculate_intent_score,
    generate_crm_dossier,
    aggregate_pipeline_metrics,
)

logger = logging.getLogger("Trekatour.SummaryAgent")


class SummaryReportAgent(Agent):
    """
    Agent 7: Neha - CRM Analytics & Executive Escalation Specialist.
    Analyzes multi-agent conversation history, scores lead purchase readiness, and produces CRM executive summaries.
    """

    DEFAULT_ALLOWED_TOOLS = ["get_customer_memory", "log_lead_status"]

    def __init__(
        self,
        llm_client: Optional[AsyncLLMClient] = None,
        config: Optional[Any] = None,
        custom_system_prompt: Optional[str] = None,
        allowed_tool_names: Optional[List[str]] = None,
        session: Optional[SessionContext] = None,
    ):
        prompt = custom_system_prompt or SUMMARY_AGENT_PROMPT
        tools = allowed_tool_names or self.DEFAULT_ALLOWED_TOOLS
        super().__init__(
            name="SummaryReportAgent",
            system_prompt=prompt,
            allowed_tool_names=tools,
            llm_client=llm_client or AsyncLLMClient(),
            config=config,
        )
        self.system_prompt = prompt
        self.session = session or SessionContext(session_id="summary_report_session")

    def score_lead(self, lead_profile: Dict[str, Any]) -> Dict[str, Any]:
        """Calculates 0-100 intent score and readiness tier."""
        return calculate_intent_score(lead_profile)

    def generate_lead_dossier(
        self,
        lead_profile: Dict[str, Any],
        itinerary: Optional[Dict[str, Any]] = None,
        quote: Optional[Dict[str, Any]] = None,
        voucher: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Generates executive CRM dossier for human sales managers."""
        return generate_crm_dossier(lead_profile, itinerary, quote, voucher)

    def generate_pipeline_report(self, leads_list: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generates agency pipeline conversion and revenue report."""
        return aggregate_pipeline_metrics(leads_list)

    async def run(
        self,
        user_prompt: str,
        session: Optional[SessionContext] = None,
        force_tool_choice: Optional[str] = None,
    ) -> AsyncGenerator[AgentEvent, None]:
        """Runs a conversational turn handling sales reporting and analytics queries."""
        target_session = session or self.session
        async for event in super().run(
            user_prompt=user_prompt,
            session=target_session,
            force_tool_choice=force_tool_choice,
        ):
            yield event


SummaryAgent = SummaryReportAgent


def create_summary_agent(
    llm_client: Optional[AsyncLLMClient] = None,
    config: Optional[Any] = None,
    session: Optional[SessionContext] = None,
) -> SummaryReportAgent:
    """Factory helper for instantiating the Summary & Reporting Agent."""
    return SummaryReportAgent(
        llm_client=llm_client,
        config=config,
        session=session,
    )
