from __future__ import annotations
import json
import os
import logging
import asyncio
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI, OpenAIError
from config.config import config
from client.response import LLMResponse, ToolCall, TokenUsage

logger = logging.getLogger("LLMClient")


class LLMClient:
    """Async OpenAI LLM Client wrapper with error handling and retries."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        default_model: Optional[str] = None,
        base_url: Optional[str] = None
    ):
        groq_key = getattr(config, "groq_api_key", None) or os.getenv("GROQ_API_KEY", "")
        
        if groq_key:
            self.api_key = groq_key
            self.base_url = "https://api.groq.com/openai/v1"
            self.default_model = default_model or os.getenv("LLM_MODEL", "groq/compound")
            self.client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)
            logger.info(f"Initialized LLMClient with Groq provider (model: {self.default_model})")
        else:
            self.api_key = api_key or config.openai_api_key
            self.base_url = base_url
            self.default_model = default_model or config.llm_model
            self.client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url) if self.api_key else None

    async def generate(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
        tool_choice: Optional[Any] = None,
        temperature: float = 0.1,
        max_tokens: int = 1000,
        max_retries: int = 3,
    ) -> LLMResponse:
        """Sends chat completion request to OpenAI API with retries."""
        if not self.client:
            raise ValueError("OpenAI API key is missing. Set OPENAI_API_KEY environment variable.")

        target_model = model or self.default_model
        kwargs: Dict[str, Any] = {
            "model": target_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if tools:
            kwargs["tools"] = tools
        if tool_choice:
            kwargs["tool_choice"] = tool_choice

        for attempt in range(1, max_retries + 1):
            try:
                response = await self.client.chat.completions.create(**kwargs)
                choice = response.choices[0]
                msg = choice.message

                tool_calls = []
                if msg.tool_calls:
                    for tc in msg.tool_calls:
                        try:
                            args = json.loads(tc.function.arguments)
                        except Exception:
                            args = {}
                        tool_calls.append(ToolCall(id=tc.id, name=tc.function.name, arguments=args))

                usage = None
                if response.usage:
                    usage = TokenUsage(
                        prompt_tokens=response.usage.prompt_tokens,
                        completion_tokens=response.usage.completion_tokens,
                        total_tokens=response.usage.total_tokens,
                    )

                return LLMResponse(
                    content=msg.content,
                    tool_calls=tool_calls,
                    finish_reason=choice.finish_reason or "stop",
                    usage=usage,
                )
            except OpenAIError as e:
                logger.warning(f"OpenAI API attempt {attempt}/{max_retries} failed: {e}")
                if attempt == max_retries:
                    raise
                await asyncio.sleep(1.0 * attempt)

        raise RuntimeError("Failed to generate response after retries")


AsyncLLMClient = LLMClient
