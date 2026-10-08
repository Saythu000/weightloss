from __future__ import annotations
import uuid
from typing import Any, Dict
from pydantic import BaseModel, Field

class SessionContext(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str = "trekatour_tenant"
    user_id: str = "lead_user"
    lead_phone: str = ""
    lead_name: str = ""
    destination: str = ""
    group_size: int = 1
    travel_dates: str = ""
    current_agent: str = "VoiceAgent"
    metadata: Dict[str, Any] = Field(default_factory=dict)
    memory_store: Dict[str, Any] = Field(default_factory=dict)
