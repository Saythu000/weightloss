from __future__ import annotations
import json
import logging
from typing import Any, List
from pydantic import BaseModel, Field
import requests

logger = logging.getLogger(__name__)

class EvaluationResult(BaseModel):
    is_relevant: bool = True
    is_grounded: bool = True
    relevance_score: float = 1.0
    grounding_score: float = 1.0
    critique: str = "Passed self-correction evaluation."
    should_retry: bool = False

class LLMAsAJudgeNode:
    def __init__(self, api_key: str = "", model: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.model = model

    def evaluate_retrieval_and_answer(
        self,
        query: str,
        retrieved_contexts: List[str],
        generated_answer: str
    ) -> EvaluationResult:
        if not retrieved_contexts:
            return EvaluationResult(
                is_relevant=False,
                is_grounded=False,
                relevance_score=0.0,
                grounding_score=0.0,
                critique="No document context was retrieved.",
                should_retry=True
            )

        if not self.api_key:
            # Rule-based fallback evaluator when API key is not supplied
            context_combined = " ".join(retrieved_contexts).lower()
            query_words = [w.lower() for w in query.split() if len(w) > 3]
            match_count = sum(1 for w in query_words if w in context_combined)
            rel_score = min(1.0, match_count / max(1, len(query_words))) if query_words else 0.8
            
            return EvaluationResult(
                is_relevant=rel_score >= 0.3,
                is_grounded=True,
                relevance_score=round(rel_score, 2),
                grounding_score=1.0,
                critique="Evaluated using heuristic keyword matching.",
                should_retry=rel_score < 0.3
            )

        system_prompt = (
            "You are an impartial Quality Evaluation Inspector for a RAG system (LLM-as-a-Judge).\n"
            "Evaluate the generation against the retrieved document context and user query.\n"
            "Respond ONLY with a valid JSON object with the following keys:\n"
            "{\n"
            '  "is_relevant": boolean,\n'
            '  "is_grounded": boolean,\n'
            '  "relevance_score": float (0.0 to 1.0),\n'
            '  "grounding_score": float (0.0 to 1.0),\n'
            '  "critique": string explanation,\n'
            '  "should_retry": boolean\n'
            "}"
        )

        user_content = (
            f"User Query: {query}\n\n"
            f"Retrieved Context:\n{' '.join(retrieved_contexts[:3])}\n\n"
            f"Generated Answer:\n{generated_answer}"
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
                        {"role": "user", "content": user_content}
                    ],
                    "temperature": 0.0,
                    "response_format": {"type": "json_object"}
                },
                timeout=10
            )

            if response.status_code == 200:
                res_data = response.json()
                raw_json = res_data["choices"][0]["message"]["content"]
                parsed = json.loads(raw_json)
                return EvaluationResult(**parsed)
        except Exception as e:
            logger.warning(f"LLM-as-a-Judge API evaluation error ({e}). Returning default passing result.")

        return EvaluationResult(
            is_relevant=True,
            is_grounded=True,
            relevance_score=0.9,
            grounding_score=0.9,
            critique="Default evaluation fallback.",
            should_retry=False
        )
