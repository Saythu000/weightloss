from __future__ import annotations
from enum import Enum
from typing import Any, Dict
from pydantic import BaseModel, Field

class EventType(str, Enum):
    TEXT_DELTA = "text_delta"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    APPROVAL_REQUEST = "approval_request"
    VOICE_OUTPUT = "voice_output"
    EVALUATION = "evaluation"
    RETRY = "retry"
    ERROR = "error"
    FINISHED = "finished"

class AgentEvent(BaseModel):
    type: EventType
    content: str = ""
    metadata: Dict[str, Any] = Field(default_factory=dict)
