from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, Field
from rag.domain_analyzer import DomainProfile

class SourceCitation(BaseModel):
    file_name: str
    relevance_score: float

class RAGResponse(BaseModel):
    answer: str = Field(description="The complete, well-structured answer grounded strictly in retrieved document context.")
    confidence_score: float = Field(description="Confidence score from 0.0 to 1.0 based on retrieved evidence quality.")
    sources: List[str] = Field(default_factory=list, description="List of source file names used for the answer.")
    needs_clarification: bool = Field(default=False, description="True if the prompt remains ambiguous despite query rewriting.")
    retried_count: int = Field(default=0, description="Number of self-correction retries executed.")
    active_domain: str = Field(default="General Corporate", description="Active domain/persona used for answering.")

DOC_RAG_DYNAMIC_TEMPLATE = """You are the Single Dedicated Document RAG AI Agent representing {company_name}.
Assigned Persona Role: {persona_role}
Current Knowledge Domain: {industry_domain}

Operating Rules:
1. Search documents using your `document_rag_search` tool whenever answering factual or policy queries.
2. Rely ONLY on facts stated directly in the retrieved sources. Never invent, assume, or hallucinate facts.
3. If the context does not contain enough evidence, answer clearly: "Based on the official {industry_domain} documents available, I could not find information on this topic."
4. Domain Guidelines:
{domain_guidelines_text}
5. Maintain a professional, empathetic, and compliant tone.
"""

def get_doc_rag_prompt(profile: Optional[DomainProfile] = None) -> str:
    dp = profile or DomainProfile()
    guidelines_str = "\n".join([f"  - {g}" for g in dp.safety_guidelines]) if dp.safety_guidelines else "  - Ground all answers strictly in retrieved context."
    return DOC_RAG_DYNAMIC_TEMPLATE.format(
        company_name=dp.company_name,
        persona_role=dp.persona_role,
        industry_domain=dp.industry_domain,
        domain_guidelines_text=guidelines_str
    )
