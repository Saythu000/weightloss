from __future__ import annotations
import re
from pathlib import Path
from typing import Callable, Optional, Dict, Any
from pydantic import BaseModel
from utils.paths import get_base_dir

class ApprovalContext(BaseModel):
    tool_name: str
    arguments: Dict[str, Any]
    agent_id: str = "agent"
    reason: str = ""

class ApprovalDecision(BaseModel):
    approved: bool
    reason: str = ""
    modified_arguments: Optional[Dict[str, Any]] = None

class ApprovalManager:
    """Safety guardrail & approval manager for tool calls and command mutations."""

    DANGEROUS_PATTERNS = [
        r"rm\s+-rf",
        r"drop\s+database",
        r"delete\s+from\s+\w+\s+where\s+1=1",
        r"truncate\s+table",
        r"format\s+[a-z]:",
        r"shutdown",
        r"reboot",
        r":\(\)\{\s*:\|:&\s*\};:", # Fork bomb
    ]

    SAFE_PATTERNS = [
        r"^cat\s+",
        r"^ls\s*",
        r"^grep\s+",
        r"^head\s+",
        r"^tail\s+",
    ]

    def __init__(self, policy: str = "auto", confirmation_callback: Optional[Callable[[ApprovalContext], ApprovalDecision]] = None):
        self.policy = policy.lower()
        self.confirmation_callback = confirmation_callback
        self.base_dir = get_base_dir()

    def check_input_safety(self, text: str) -> tuple[bool, str]:
        """Validates command text against dangerous pattern regexes."""
        for pattern in self.DANGEROUS_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return False, f"Dangerous command pattern detected: '{pattern}'"
        return True, "Safe"

    def is_path_safe(self, target_path: str | Path) -> bool:
        """Ensures file paths remain within workspace boundaries."""
        try:
            resolved = Path(target_path).resolve()
            return self.base_dir in resolved.parents or resolved == self.base_dir
        except Exception:
            return False

    def evaluate_tool_call(self, context: ApprovalContext) -> ApprovalDecision:
        """Evaluates whether a tool call can proceed automatically or requires human confirmation."""
        # 1. Check arguments string for dangerous command patterns
        args_str = str(context.arguments)
        is_safe, msg = self.check_input_safety(args_str)
        if not is_safe:
            return ApprovalDecision(approved=False, reason=msg)

        # 2. Check path safety if file paths are passed
        if "file_path" in context.arguments or "path" in context.arguments:
            p = context.arguments.get("file_path") or context.arguments.get("path")
            if p and not self.is_path_safe(p):
                return ApprovalDecision(approved=False, reason=f"Path '{p}' is outside allowed workspace directory.")

        # 3. Handle Policy
        if self.policy == "auto":
            return ApprovalDecision(approved=True, reason="Auto approved by policy.")

        if self.policy == "require_approval" and self.confirmation_callback:
            return self.confirmation_callback(context)

        return ApprovalDecision(approved=True, reason="Default approval.")
