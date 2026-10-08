from __future__ import annotations
import logging
from typing import Dict, List, Optional, Any
from tools.base import Tool

logger = logging.getLogger("ToolRegistry")

class ToolRegistry:
    """Central Tool Registry for registering, retrieving, and filtering Agent Tools."""

    def __init__(self):
        self._tools: Dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        if tool.name in self._tools:
            logger.warning(f"Overwriting registered tool: '{tool.name}'")
        self._tools[tool.name] = tool
        logger.info(f"Registered tool '{tool.name}' ({tool.kind.value})")

    def get(self, name: str) -> Optional[Tool]:
        return self._tools.get(name)

    def get_all_tools(self) -> List[Tool]:
        return list(self._tools.values())

    def list_tools(self) -> List[str]:
        return list(self._tools.keys())

    def get_openai_schemas(self, allowed_names: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        schemas = []
        for name, tool in self._tools.items():
            if allowed_names is None or name in allowed_names:
                schemas.append(tool.to_openai_schema())
        return schemas
