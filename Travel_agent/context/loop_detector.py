from __future__ import annotations
from typing import List, Dict, Any, Tuple

class LoopDetector:
    """Detects when an agent is stuck in repetitive tool call loops."""

    def __init__(self, max_repeats: int = 3):
        self.max_repeats = max_repeats
        self.call_history: List[Tuple[str, str]] = []

    def record_tool_call(self, tool_name: str, arguments: Dict[str, Any]) -> bool:
        """Records a tool call and returns True if an infinite loop is detected."""
        arg_signature = str(sorted(arguments.items()))
        self.call_history.append((tool_name, arg_signature))

        if len(self.call_history) >= self.max_repeats:
            recent = self.call_history[-self.max_repeats:]
            if len(set(recent)) == 1:
                return True
        return False

    def reset(self) -> None:
        self.call_history = []
