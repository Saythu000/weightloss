from __future__ import annotations
from typing import Any, Dict
from tools.base import Tool, ToolKind, ToolResult
from tools.mcp.client import MCPClient

class MCPTool(Tool):
    """Wraps an MCP server endpoint into an executable Agent Tool."""

    def __init__(self, mcp_client: MCPClient, tool_name: str, description: str, kind: ToolKind = ToolKind.MCP):
        self.mcp_client = mcp_client
        self.name = tool_name
        self.description = description
        self.kind = kind

    def run(self, **kwargs: Any) -> ToolResult:
        res = self.mcp_client.call_tool(self.name, kwargs)
        if "error" in res:
            return ToolResult(success=False, output="", error=str(res["error"]))
        
        result_content = res.get("result", {}).get("content", str(res))
        return ToolResult(success=True, output=str(result_content))
