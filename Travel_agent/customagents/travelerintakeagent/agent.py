"""Traveler Intake & Qualification Agent Module"""

from customagents.factory import AgentFactory
from travelerintakeagent.prompts import INTAKE_AGENT_PROMPT
from client.llm_client import AsyncLLMClient


def create_intake_agent(llm_client: AsyncLLMClient):
    return AgentFactory.create_agent(
        agent_type="intake_agent",
        llm_client=llm_client,
        custom_system_prompt=INTAKE_AGENT_PROMPT,
    )
