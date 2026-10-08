from __future__ import annotations
import logging
from typing import Dict, Any
from tools.mcp.client import MCPClient
from tools.mcp.mcp_tool import MCPTool
from tools.registry import ToolRegistry
from config.loader import get_merged_config

logger = logging.getLogger("MCPManager")

class MCPManager:
    """Manages lifecycle of all configured MCP server clients."""

    def __init__(self, tool_registry: ToolRegistry):
        self.tool_registry = tool_registry
        self.clients: Dict[str, MCPClient] = {}

    def load_and_start_servers(self) -> None:
        cfg = get_merged_config()
        mcp_configs = cfg.get("mcp_servers", {})

        for name, server_cfg in mcp_configs.items():
            cmd = server_cfg.get("command", "python3")
            args = server_cfg.get("args", [])
            env = server_cfg.get("env", {})

            client = MCPClient(name=name, command=cmd, args=args, env=env)
            client.start()
            self.clients[name] = client

            # Register standard MCP tool wrappers
            tool_wrapper = MCPTool(
                mcp_client=client,
                tool_name=f"mcp_{name}_tool",
                description=f"Executes operations on {name} MCP server."
            )
            self.tool_registry.register(tool_wrapper)

    def stop_all(self) -> None:
        for client in self.clients.values():
            client.stop()
        self.clients.clear()
