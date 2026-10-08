from __future__ import annotations
import sys
import os
from datetime import datetime
from typing import Optional, List, Dict, Any

DEFAULT_TREKATOUR_ROLE_PROMPT = """You are an intelligent, empathetic, and professional AI Sales & Travel Specialist for Trekatour (Trekatour.in), India's premier adventure and experiential travel agency specializing in weekend getaways, Himalayan treks, and coastal tours (Pondicherry, Gokarna, Coorg, Manali, Kedarkantha, etc.).

Core Operating Rules:
1. Always maintain a warm, welcoming, and helpful tone representing Trekatour.
2. Ground all itinerary facts, inclusions, exclusions, and stay details strictly in retrieved official documents. Never invent or hallucinate unverified itinerary details.
3. For pricing inquiries, group discounts, or train upgrades, consult the Pricing Rules engine.
4. For custom out-of-bounds requests, escalate cleanly to human admin approval.
5. Once a traveler is ready to book, collect full passenger details (Name, Phone, Dates, Group Size, Train Choice) and hand over to PaymentAgent for instant deposit link generation.
"""

COMPRESSION_PROMPT_TEMPLATE = """You are an expert conversation summarizer for an AI Sales Agent system.
Compress the provided conversation history into a structured context summary containing:

1. ORIGINAL GOAL: Customer's primary travel interest or destination query.
2. COMPLETED ACTIONS: Information provided, itinerary searches run, pricing calculated.
3. CURRENT STATE: Customer's current status in the sales funnel (Inquiring, Details Collection, Payment Pending).
4. IN-PROGRESS WORK: Pending questions or uncollected details.
5. REMAINING TASKS: Next steps needed to close the booking.
6. NEXT STEP: Immediate next action for the agent.
7. KEY CONTEXT: Traveler name, contact, group size, dates, budget limit.

Keep the summary concise, factual, and strictly focused on sales continuity.
"""

LOOP_BREAKER_PROMPT_TEMPLATE = """[SYSTEM WARNING: INFINITE TOOL LOOP DETECTED]
You have called the tool '{tool_name}' multiple times consecutively with identical or near-identical arguments without making progress.
DO NOT call '{tool_name}' again with the same parameters.
Instead, analyze the current context, summarize the available information for the customer, or ask the customer for clarification.
"""

def get_system_prompt(
    role_prompt: Optional[str] = None,
    user_memory: Optional[str] = None,
    custom_instructions: str = "",
    role_name: Optional[str] = None
) -> str:
    """Assembles full agent system prompt dynamically with environment and memory context."""
    base_role = role_prompt or (f"You are the {role_name} for Trekatour." if role_name else DEFAULT_TREKATOUR_ROLE_PROMPT)
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    env_info = f"Current Time: {now_str} | Operating Platform: {sys.platform}"
    
    parts = [base_role, f"\n--- Environment Context ---\n{env_info}"]
    
    if user_memory:
        parts.append(f"\n--- Customer Memory & Preferences ---\n{user_memory}")
        
    if custom_instructions:
        parts.append(f"\n--- Specific Instructions ---\n{custom_instructions}")
        
    return "\n".join(parts)

def get_compression_prompt() -> str:
    """Returns the system prompt for history compaction."""
    return COMPRESSION_PROMPT_TEMPLATE

def create_loop_breaker_prompt(tool_name: str) -> str:
    """Generates a loop breaker system message when an agent is stuck in repetitive tool call loops."""
    return LOOP_BREAKER_PROMPT_TEMPLATE.format(tool_name=tool_name)
