from __future__ import annotations
import logging
from typing import List, Dict, Any
from prompts.system import get_compression_prompt

logger = logging.getLogger("ChatCompactor")

class ChatCompactor:
    """Summarizes conversation history when context length exceeds limits."""

    def __init__(self, llm_client: Any = None):
        self.llm_client = llm_client

    async def compact_history(self, messages: List[Dict[str, Any]]) -> str:
        """Compresses message history into structured summary."""
        if not messages:
            return ""

        if self.llm_client:
            try:
                system_prompt = get_compression_prompt()
                user_content = f"Summarize this sales conversation history:\n{messages}"
                resp = await self.llm_client.generate(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content}
                    ]
                )
                return resp
            except Exception as e:
                logger.error(f"Error during LLM context compaction: {e}")

        # Fallback heuristic summary
        summary_lines = ["--- Conversation Summary ---"]
        for m in messages[-6:]:
            role = m.get("role", "user").upper()
            content = str(m.get("content", ""))[:150]
            summary_lines.append(f"{role}: {content}")
        return "\n".join(summary_lines)
