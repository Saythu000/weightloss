from __future__ import annotations
import json
import logging
from typing import AsyncGenerator, List, Optional, Dict, Any

from agent.events import AgentEvent, EventType
from agent.session import SessionContext
from client.llm_client import LLMClient
from context.manager import ContextManager
from context.loop_detector import LoopDetector
from safety.approval import ApprovalManager, ApprovalContext
from hooks.hook_system import global_hook_system, HookType
from tools.registry import ToolRegistry
from config.config import config

logger = logging.getLogger("BaseAgent")

class Agent:
    """Base ReAct Agent loop engine."""

    def __init__(
        self,
        name: str = "BaseAgent",
        system_prompt: str = "",
        allowed_tool_names: Optional[List[str]] = None,
        tool_registry: Optional[ToolRegistry] = None,
        context_manager: Optional[ContextManager] = None,
        approval_manager: Optional[ApprovalManager] = None,
        llm_client: Optional[LLMClient] = None,
        config: Optional[Any] = None
    ):
        self.name = name
        self.config = config

        self.allowed_tool_names = allowed_tool_names
        self.tool_registry = tool_registry or ToolRegistry()
        self.context_manager = context_manager or ContextManager(system_prompt=system_prompt)
        policy_str = config.approval_policy if (config and hasattr(config, "approval_policy")) else "auto"

        self.approval_manager = approval_manager or ApprovalManager(policy=policy_str)

        self.llm_client = llm_client or LLMClient()
        self.loop_detector = LoopDetector(max_repeats=3)

    async def run(
        self,
        user_prompt: str,
        session: SessionContext,
        force_tool_choice: Optional[str] = None
    ) -> AsyncGenerator[AgentEvent, None]:
        """Executes ReAct loop asynchronously yielding AgentEvent stream."""

        global_hook_system.trigger(HookType.BEFORE_AGENT_RUN, agent=self, prompt=user_prompt, session=session)

        # 1. Safety Check on User Input
        safe, reason = self.approval_manager.check_input_safety(user_prompt)
        if not safe:
            yield AgentEvent(type=EventType.ERROR, content=f"Safety Violation: {reason}")
            return

        self.context_manager.add_message("user", user_prompt)

        # 2. Filter schemas by allowed_tool_names
        all_schemas = self.tool_registry.get_openai_schemas()
        if self.allowed_tool_names is not None:
            tools_schema = [s for s in all_schemas if s.get("function", {}).get("name") in self.allowed_tool_names]
        else:
            tools_schema = all_schemas

        max_turns = 5
        turn = 0
        final_answer = ""

        while turn < max_turns:
            turn += 1
            messages = self.context_manager.get_formatted_messages()

            tool_choice_arg = "auto"
            if force_tool_choice:
                tool_choice_arg = {"type": "function", "function": {"name": force_tool_choice}}

            try:
                llm_resp = await self.llm_client.generate(
                    messages=messages,
                    tools=tools_schema if tools_schema else None,
                    tool_choice=tool_choice_arg if tools_schema else None
                )

                if llm_resp.tool_calls:
                    # Append assistant message with tool calls
                    assistant_msg = {
                        "role": "assistant",
                        "content": llm_resp.content,
                        "tool_calls": [
                            {
                                "id": tc.id,
                                "type": "function",
                                "function": {"name": tc.name, "arguments": json.dumps(tc.arguments)}
                            }
                            for tc in llm_resp.tool_calls
                        ]
                    }
                    self.context_manager.messages.append(assistant_msg)

                    for tc in llm_resp.tool_calls:
                        fn_name = tc.name
                        fn_args = tc.arguments

                        yield AgentEvent(type=EventType.TOOL_CALL, content=f"Calling tool '{fn_name}'", metadata={"args": fn_args})

                        # Loop Detection
                        if self.loop_detector.record_tool_call(fn_name, fn_args):
                            warn_msg = f"Infinite loop detected calling tool '{fn_name}' repeatedly."
                            yield AgentEvent(type=EventType.ERROR, content=warn_msg)
                            self.context_manager.add_message("system", warn_msg)
                            break

                        # Safety Approval Evaluation
                        approval_ctx = ApprovalContext(tool_name=fn_name, arguments=fn_args, agent_id=self.name)
                        decision = self.approval_manager.evaluate_tool_call(approval_ctx)

                        if not decision.approved:
                            err_content = f"Tool execution denied: {decision.reason}"
                            yield AgentEvent(type=EventType.ERROR, content=err_content)
                            self.context_manager.add_message("tool", err_content, tool_call_id=tc.id)
                            continue

                        # Execute Tool
                        global_hook_system.trigger(HookType.BEFORE_TOOL_EXECUTE, tool_name=fn_name, args=fn_args)
                        target_tool = self.tool_registry.get(fn_name)

                        if target_tool:
                            tool_res = target_tool.run(**fn_args)
                            global_hook_system.trigger(HookType.AFTER_TOOL_EXECUTE, tool_name=fn_name, result=tool_res)
                            
                            output_str = tool_res.output if tool_res.success else f"Tool Error: {tool_res.error}"
                            yield AgentEvent(type=EventType.TOOL_RESULT, content=output_str, metadata=tool_res.metadata)

                            self.context_manager.add_message("tool", output_str, tool_call_id=tc.id)
                        else:
                            err_msg = f"Tool '{fn_name}' is not registered."
                            yield AgentEvent(type=EventType.ERROR, content=err_msg)
                            self.context_manager.add_message("tool", err_msg, tool_call_id=tc.id)
                else:
                    # Final Text Response
                    final_answer = llm_resp.content or ""
                    self.context_manager.add_message("assistant", final_answer)
                    yield AgentEvent(type=EventType.TEXT_DELTA, content=final_answer)
                    yield AgentEvent(type=EventType.FINISHED, content=final_answer)
                    global_hook_system.trigger(HookType.AFTER_AGENT_RUN, agent=self, answer=final_answer)
                    return

            except Exception as e:
                logger.error(f"Error in Agent execution turn: {e}")
                global_hook_system.trigger(HookType.ON_ERROR, error=e)
                yield AgentEvent(type=EventType.ERROR, content=f"Execution Exception: {str(e)}")
                return

        yield AgentEvent(type=EventType.FINISHED, content=final_answer)
