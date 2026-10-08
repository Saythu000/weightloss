from __future__ import annotations
import logging
from typing import Generator, Optional
from agent.agent import Agent
from agent.events import AgentEvent, EventType
from agent.session import SessionContext
from customagents.documentragagent.doc_rag_prompt import get_doc_rag_prompt, RAGResponse
from rag.domain_analyzer import DomainProfile
from rag.evaluator import LLMAsAJudgeNode
from tools.builtin.rag_tool import DocumentRAGTool
from tools.registry import ToolRegistry
from config.config import config

logger = logging.getLogger(__name__)

class DocumentRAGAgent(Agent):
    def __init__(self, rag_tool: Optional[DocumentRAGTool] = None, domain_profile: Optional[DomainProfile] = None):
        registry = ToolRegistry()
        self.rag_tool = rag_tool or DocumentRAGTool()
        registry.register(self.rag_tool)
        self.domain_profile = domain_profile or DomainProfile()

        super().__init__(
            name="DocumentRAGAgent",
            system_prompt=get_doc_rag_prompt(self.domain_profile),
            tool_registry=registry
        )

        self.evaluator = LLMAsAJudgeNode(api_key=config.openai_api_key, model=config.llm_model)

    def set_domain_profile(self, profile: DomainProfile):
        self.domain_profile = profile
        self.system_prompt = get_doc_rag_prompt(profile)

    def run(self, user_prompt: str, session: SessionContext) -> Generator[AgentEvent, None, str]:
        max_retries = 2
        attempt = 0
        current_query = user_prompt

        while attempt <= max_retries:
            attempt += 1
            yield AgentEvent(
                type=EventType.TEXT_DELTA,
                content=f"Starting Document RAG execution (Attempt {attempt})...",
                metadata={"attempt": attempt, "domain": self.domain_profile.industry_domain}
            )

            # 1. Execute RAG Retrieval
            tool_res = self.rag_tool.run(query=current_query, tenant_id=session.tenant_id)
            retrieved_text = tool_res.output
            retrieved_chunks = [c.get("text", "") for c in tool_res.metadata.get("raw_results", [])]
            sources = [c.get("metadata", {}).get("file_name", "Unknown") for c in tool_res.metadata.get("raw_results", [])]
            unique_sources = list(dict.fromkeys(sources))

            yield AgentEvent(
                type=EventType.TOOL_RESULT,
                content=f"Retrieved {len(retrieved_chunks)} document sections.",
                metadata={"sources": unique_sources, "query": current_query}
            )

            # 2. Generate Candidate Answer
            prompt_with_context = (
                f"Domain: {self.domain_profile.industry_domain}\n"
                f"User Question: {user_prompt}\n\n"
                f"Retrieved Document Context:\n{retrieved_text}\n\n"
                f"Provide a clear, fact-based response grounded ONLY in the retrieved document context."
            )

            raw_answer = yield from super().run(user_prompt=prompt_with_context, session=session)

            # 3. LLM-as-a-Judge Evaluation & Self-Correction
            yield AgentEvent(type=EventType.EVALUATION, content="Running LLM-as-a-Judge quality evaluation...")
            eval_res = self.evaluator.evaluate_retrieval_and_answer(
                query=user_prompt,
                retrieved_contexts=retrieved_chunks,
                generated_answer=raw_answer
            )

            yield AgentEvent(
                type=EventType.EVALUATION,
                content=f"Evaluation Grade -> Relevance: {eval_res.relevance_score}, Grounding: {eval_res.grounding_score}. Critique: {eval_res.critique}",
                metadata=eval_res.model_dump()
            )

            # 4. Check if Self-Correction Retry is needed
            if eval_res.should_retry and attempt <= max_retries:
                yield AgentEvent(
                    type=EventType.RETRY,
                    content=f"Self-correction triggered: Retrying search with expanded prompt (Attempt {attempt + 1})...",
                    metadata={"critique": eval_res.critique}
                )
                current_query = f"{user_prompt} detailed evidence overview"
                continue

            # Return Structured Final Response
            structured_resp = RAGResponse(
                answer=raw_answer,
                confidence_score=eval_res.relevance_score,
                sources=unique_sources,
                needs_clarification=not eval_res.is_relevant,
                retried_count=attempt - 1,
                active_domain=self.domain_profile.industry_domain
            )

            final_str = structured_resp.model_dump_json(indent=2)
            yield AgentEvent(type=EventType.FINISHED, content=final_str, metadata=structured_resp.model_dump())
            return final_str

        return raw_answer
