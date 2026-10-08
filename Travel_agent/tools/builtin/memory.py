from __future__ import annotations
from typing import Any, Dict
from pydantic import BaseModel, Field
from tools.base import Tool, ToolKind, ToolResult

_GLOBAL_MEMORY_STORE: Dict[str, Dict[str, Any]] = {}

class SaveMemoryArgs(BaseModel):
    user_id: str = Field(description="Customer phone number or unique lead ID")
    key: str = Field(description="Preference key (e.g. 'preferred_destination', 'budget', 'dietary_pref')")
    value: str = Field(description="Preference value")

class SaveMemoryTool(Tool):
    name = "save_customer_memory"
    description = "Saves customer travel preferences, budget limits, or dietary restrictions for future turns."
    kind = ToolKind.MEMORY
    args_schema = SaveMemoryArgs

    def run(self, user_id: str, key: str, value: str, **kwargs: Any) -> ToolResult:
        if user_id not in _GLOBAL_MEMORY_STORE:
            _GLOBAL_MEMORY_STORE[user_id] = {}
        _GLOBAL_MEMORY_STORE[user_id][key] = value
        return ToolResult(success=True, output=f"Successfully saved memory '{key}={value}' for user {user_id}.")

class GetMemoryArgs(BaseModel):
    user_id: str = Field(description="Customer phone number or unique lead ID")

class GetMemoryTool(Tool):
    name = "get_customer_memory"
    description = "Retrieves all saved customer travel preferences and notes."
    kind = ToolKind.MEMORY
    args_schema = GetMemoryArgs

    def run(self, user_id: str, **kwargs: Any) -> ToolResult:
        memories = _GLOBAL_MEMORY_STORE.get(user_id, {})
        if not memories:
            return ToolResult(success=True, output=f"No stored memories found for user {user_id}.")
        return ToolResult(success=True, output=f"Stored memories for user {user_id}:\n{memories}")
