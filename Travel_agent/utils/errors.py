from __future__ import annotations

class AgentException(Exception):
    """Base exception for all AI Agent errors."""
    pass

class ToolExecutionError(AgentException):
    """Raised when an Agent Tool execution fails."""
    def __init__(self, tool_name: str, message: str):
        self.tool_name = tool_name
        self.message = message
        super().__init__(f"Tool '{tool_name}' failed: {message}")

class RAGQueryError(AgentException):
    """Raised when vector DB or hybrid search fails."""
    pass

class VoiceEngineError(AgentException):
    """Raised when STT, TTS, or VAD processing encounters an error."""
    pass

class PaymentGatewayError(AgentException):
    """Raised when Razorpay link creation or webhook verification fails."""
    pass

class LeadLoggingError(AgentException):
    """Raised when reading or writing Excel lead sheets fails."""
    pass
