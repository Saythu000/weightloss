"""
Trekatour Multi-Agent Session Manager
Coordinates active user sessions across specialized agents (Voice, WhatsApp, Payment, RAG).
"""

from typing import Dict, Any, Optional
import logging
from customagents.factory import AgentFactory
from client.llm_client import AsyncLLMClient
from agent.agent import Agent
from agent.session import SessionContext

logger = logging.getLogger("Trekatour.CustomAgents.SessionManager")


class SessionManager:
    """
    Manages state and agent execution routing for active sales leads.
    """

    def __init__(self, llm_client: AsyncLLMClient):
        self.llm_client = llm_client
        self._active_sessions: Dict[str, SessionContext] = {}
        self._cached_agents: Dict[str, Agent] = {}

    def get_or_create_session(self, session_id: str, lead_phone: Optional[str] = None) -> SessionContext:
        """Retrieves or creates active SessionContext."""
        if session_id not in self._active_sessions:
            ctx = SessionContext(session_id=session_id)
            if lead_phone:
                ctx.set_variable("phone", lead_phone)
            self._active_sessions[session_id] = ctx
            logger.info(f"Created new SessionContext: {session_id}")
        return self._active_sessions[session_id]

    def get_agent_instance(self, agent_type: str) -> Agent:
        """Retrieves or lazily instantiates agent type."""
        agent_type_clean = agent_type.lower().strip()
        if agent_type_clean not in self._cached_agents:
            agent = AgentFactory.create_agent(agent_type=agent_type_clean, llm_client=self.llm_client)
            self._cached_agents[agent_type_clean] = agent
        return self._cached_agents[agent_type_clean]

    async def execute_task_with_agent(
        self, agent_type: str, session_id: str, user_input: str
    ) -> str:
        """Executes a user request against a specific sub-agent."""
        session_ctx = self.get_or_create_session(session_id)
        agent = self.get_agent_instance(agent_type)
        response_text = await agent.run(user_input=user_input, session_context=session_ctx)
        return response_text
