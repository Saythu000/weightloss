from __future__ import annotations
import subprocess
import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("MCPClient")

class MCPClient:
    """Model Context Protocol (MCP) Client wrapper over subprocess/stdio."""

    def __init__(self, name: str, command: str, args: Optional[list[str]] = None, env: Optional[Dict[str, str]] = None):
        self.name = name
        self.command = command
        self.args = args or []
        self.env = env or {}
        self.process: Optional[subprocess.Popen] = None

    def start(self) -> None:
        """Launches the MCP server process."""
        try:
            full_cmd = [self.command] + self.args
            self.process = subprocess.Popen(
                full_cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=self.env
            )
            logger.info(f"Started MCP Client '{self.name}' with pid {self.process.pid}")
        except Exception as e:
            logger.error(f"Failed to start MCP server '{self.name}': {e}")

    def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Sends a JSON-RPC request to the MCP server process."""
        if not self.process or self.process.poll() is not None:
            return {"error": f"MCP Server '{self.name}' is not running."}

        req = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": tool_name, "arguments": arguments}
        }
        try:
            self.process.stdin.write(json.dumps(req) + "\n")
            self.process.stdin.flush()
            response_line = self.process.stdout.readline()
            if not response_line:
                return {"error": "Empty response from MCP server"}
            return json.loads(response_line)
        except Exception as e:
            return {"error": f"MCP Call Exception: {e}"}

    def stop(self) -> None:
        if self.process and self.process.poll() is None:
            self.process.terminate()
            self.process.wait()
            logger.info(f"Stopped MCP Client '{self.name}'")
