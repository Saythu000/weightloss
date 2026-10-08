from __future__ import annotations
import abc
from enum import Enum
from typing import Any, Type, Optional, Dict
from pydantic import BaseModel, Field
from pydantic.json_schema import model_json_schema

class ToolKind(str, Enum):
    READ = "read"
    WRITE = "write"
    RAG = "rag"
    MEMORY = "memory"
    MCP = "mcp"
    SYSTEM = "system"

class ToolConfirmation(BaseModel):
    required: bool = False
    message: str = ""

class ToolResult(BaseModel):
    success: bool
    output: str
    error: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class Tool(abc.ABC):
    name: str
    description: str
    kind: ToolKind = ToolKind.READ
    args_schema: Optional[Type[BaseModel]] = None
    confirmation: ToolConfirmation = Field(default_factory=ToolConfirmation)

    @abc.abstractmethod
    def run(self, **kwargs: Any) -> ToolResult:
        pass

    def to_openai_schema(self) -> Dict[str, Any]:
        parameters = {}
        if self.args_schema:
            parameters = model_json_schema(self.args_schema)
            parameters.pop("title", None)
            parameters.pop("description", None)
        else:
            parameters = {"type": "object", "properties": {}}

        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": parameters,
            },
        }
