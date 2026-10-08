from __future__ import annotations
import logging
from typing import Callable, Dict, List, Any, Optional
from enum import Enum

logger = logging.getLogger("HookSystem")

class HookType(str, Enum):
    BEFORE_AGENT_RUN = "before_agent_run"
    AFTER_AGENT_RUN = "after_agent_run"
    BEFORE_TOOL_EXECUTE = "before_tool_execute"
    AFTER_TOOL_EXECUTE = "after_tool_execute"
    ON_ERROR = "on_error"

class HookSystem:
    """Manages lifecycle hooks across agents and tools."""

    def __init__(self):
        self._hooks: Dict[HookType, List[Callable[..., Any]]] = {
            hook_type: [] for hook_type in HookType
        }

    def register(self, hook_type: HookType, callback: Callable[..., Any]) -> None:
        """Registers a hook callback."""
        if callback not in self._hooks[hook_type]:
            self._hooks[hook_type].append(callback)
            logger.info(f"Registered hook for {hook_type.value}: {callback.__name__}")

    def trigger(self, hook_type: HookType, **kwargs: Any) -> None:
        """Triggers all registered callbacks for a specific hook event."""
        for callback in self._hooks[hook_type]:
            try:
                callback(**kwargs)
            except Exception as e:
                logger.error(f"Error executing hook '{callback.__name__}' on {hook_type.value}: {e}")

global_hook_system = HookSystem()
