from __future__ import annotations
from typing import Any, List, Dict, Optional

try:
    import tiktoken
except ImportError:
    tiktoken = None

class ContextManager:
    """Manages chat context history, system prompt injection, and token limits."""

    def __init__(self, system_prompt: str = "", max_tokens: int = 4000, model: str = "gpt-4o-mini"):
        self.system_prompt = system_prompt
        self.max_tokens = max_tokens
        self.model = model
        self.messages: List[Dict[str, Any]] = []

    def set_system_prompt(self, prompt: str) -> None:
        self.system_prompt = prompt

    def add_message(self, role: str, content: str, **kwargs: Any) -> None:
        msg = {"role": role, "content": content}
        msg.update(kwargs)
        self.messages.append(msg)

    def get_formatted_messages(self) -> List[Dict[str, Any]]:
        formatted = []
        if self.system_prompt:
            formatted.append({"role": "system", "content": self.system_prompt})
        formatted.extend(self.messages)
        return formatted

    def estimate_token_count(self) -> int:
        """Estimates total token usage for current context."""
        text = self.system_prompt + "".join(str(m.get("content", "")) for m in self.messages)
        if tiktoken:
            try:
                enc = tiktoken.encoding_for_model(self.model)
                return len(enc.encode(text))
            except Exception:
                pass
        return len(text) // 4

    def is_context_full(self, threshold: float = 0.8) -> bool:
        """Checks if current token count exceeds threshold percentage of max_tokens."""
        return self.estimate_token_count() >= (self.max_tokens * threshold)

    def prune_context(self, keep_last: int = 10) -> None:
        """Keeps system prompt and sliding window of recent messages."""
        if len(self.messages) > keep_last:
            self.messages = self.messages[-keep_last:]

    def clear(self) -> None:
        self.messages = []
