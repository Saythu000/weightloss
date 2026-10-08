from __future__ import annotations
import json
import logging
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from openai import OpenAI
from config.config import config

logger = logging.getLogger(__name__)

class DomainProfile(BaseModel):
    company_name: str = Field(default="Company Knowledge Base", description="Name of the organization or platform inferred from documents.")
    industry_domain: str = Field(default="General Corporate & Policy", description="Primary industry domain (e.g. Healthcare/GLP-1 Weight Loss, Travel, Real Estate, E-Commerce).")
    persona_role: str = Field(default="Document Information Specialist", description="Assigned role for the RAG agent based on domain context.")
    safety_guidelines: List[str] = Field(default_factory=list, description="Key operating principles, compliance notes, and safety guidelines for the domain.")

class DomainAnalyzer:
    """
    Analyzes uploaded documents to automatically infer domain, company persona, and operating guidelines.
    Enables dynamic persona adaptation when knowledge bases change.
    """
    def __init__(self, client: Optional[OpenAI] = None):
        self.client = client or (OpenAI(api_key=config.openai_api_key) if config.openai_api_key else None)

    def analyze_document_sample(self, text_sample: str) -> DomainProfile:
        """
        Takes a representative text sample of uploaded documents and returns a DomainProfile.
        """
        if not text_sample or not text_sample.strip():
            return DomainProfile()

        # Truncate text sample to save tokens
        sample = text_sample[:2500]

        if not self.client:
            logger.warning("OpenAI client not configured; returning fallback generic DomainProfile.")
            return self._heuristic_fallback(sample)

        prompt = (
            "Analyze the following document sample and extract domain metadata to build an AI agent persona.\n\n"
            f"--- DOCUMENT SAMPLE ---\n{sample}\n-----------------------\n\n"
            "Respond strictly with a JSON object matching this schema:\n"
            "{\n"
            '  "company_name": "Inferred company or platform name",\n'
            '  "industry_domain": "Specific industry (e.g., Healthcare / GLP-1 Weight Loss Treatment, Travel Concierge, Real Estate)",\n'
            '  "persona_role": "Professional role description for the assistant",\n'
            '  "safety_guidelines": ["Guideline 1", "Guideline 2", "Guideline 3"]\n'
            "}"
        )

        try:
            response = self.client.chat.completions.create(
                model=config.llm_model,
                messages=[
                    {"role": "system", "content": "You are an expert AI persona and domain classification analyzer. Output raw JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.0,
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content or "{}"
            data = json.loads(content)
            return DomainProfile(
                company_name=data.get("company_name", "Company Knowledge Base"),
                industry_domain=data.get("industry_domain", "General Corporate"),
                persona_role=data.get("persona_role", "Document Support Specialist"),
                safety_guidelines=data.get("safety_guidelines", [])
            )
        except Exception as e:
            logger.error(f"Error executing LLM domain analysis: {e}. Using fallback.")
            return self._heuristic_fallback(sample)

    def _heuristic_fallback(self, sample: str) -> DomainProfile:
        sample_lower = sample.lower()
        if any(w in sample_lower for w in ["drgodly", "glp-1", "semaglutide", "semalix", "obeda", "sundae", "doctor", "weight loss"]):
            return DomainProfile(
                company_name="DrGodly",
                industry_domain="Doctor-Guided GLP-1 Weight Loss Treatment & Healthcare",
                persona_role="DrGodly Clinical & Product Support Specialist",
                safety_guidelines=[
                    "Provide factual details on Semaglutide formulations (Semalix, Obeda, Sundae).",
                    "Emphasize the 4-step patient care pathway (Screening -> Doctor Consultation -> Express Cold-Chain Delivery -> Continuous Care).",
                    "Always remind users that medical prescriptions are issued exclusively by qualified doctors."
                ]
            )
        elif any(w in sample_lower for w in ["travel", "hotel", "flight", "booking", "destination", "itinerary"]):
            return DomainProfile(
                company_name="Travel Services",
                industry_domain="Travel, Hospitality & Tourism",
                persona_role="Travel & Booking Concierge Specialist",
                safety_guidelines=[
                    "Assist users with itinerary details, hotel bookings, and travel insurance policies.",
                    "Provide clear cancellation and refund terms."
                ]
            )
        return DomainProfile()
