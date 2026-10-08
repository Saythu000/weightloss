from __future__ import annotations
from typing import Any, Optional
from pydantic import BaseModel, Field
from tools.base import Tool, ToolKind, ToolResult

class SubagentArgs(BaseModel):
    agent_name: str = Field(description="Name of specialized sub-agent (e.g. ItineraryRAGAgent, DiscountCalculatorAgent, PaymentAgent)")
    task_prompt: str = Field(description="Detailed task description for subagent execution")

class DelegateSubagentTool(Tool):
    name = "delegate_subagent"
    description = "Delegates a specialized sub-task to another agent (e.g. RAG itinerary search, group discount calculation, payment link generation)."
    kind = ToolKind.SYSTEM
    args_schema = SubagentArgs

    def __init__(self, session_manager: Optional[Any] = None):
        self.session_manager = session_manager

    def run(self, agent_name: str, task_prompt: str, **kwargs: Any) -> ToolResult:
        if self.session_manager:
            try:
                result_str = self.session_manager.delegate_task(agent_name, task_prompt)
                return ToolResult(success=True, output=result_str)
            except Exception as e:
                return ToolResult(success=False, output="", error=f"Delegation failed: {e}")

        return ToolResult(
            success=True,
            output=f"Simulated delegation to '{agent_name}' with prompt: '{task_prompt}'"
        )
