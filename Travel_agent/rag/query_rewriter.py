from __future__ import annotations
import logging
from typing import Any
import requests

logger = logging.getLogger(__name__)

class QueryRewriterNode:
    def __init__(self, api_key: str = "", model: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.model = model

    def rewrite_query(self, query: str) -> str:
        # If query is already specific and longer than 15 words, return as is
        if len(query.split()) >= 15:
            return query

        if not self.api_key:
            # Smart fallback rule expansion if API key is not present
            return f"{query} details specifications policy guidelines information"

        system_prompt = (
            "You are a Search Query Optimization Assistant. "
            "Your task is to take a brief or vague user query and rewrite it into a detailed, "
            "unambiguous search query optimized for vector and keyword document retrieval. "
            "Output ONLY the rewritten search query text without any markdown or conversational filler."
        )

        try:
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Original User Query: {query}"}
                    ],
                    "temperature": 0.0,
                    "max_tokens": 100
                },
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                rewritten = data["choices"][0]["message"]["content"].strip()
                logger.info(f"Query Rewritten: '{query}' -> '{rewritten}'")
                return rewritten
        except Exception as e:
            logger.warning(f"QueryRewriter API call failed ({e}). Returning expanded original query.")

        return f"{query} details specifications policy guidelines information"
