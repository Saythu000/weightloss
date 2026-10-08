"""
Base Abstract Class for Speech-to-Text (STT) Providers
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class BaseSTTProvider(ABC):
    """Abstract interface for STT engines (Sarvam AI, OpenAI Whisper, Groq, HuggingFace)."""

    def __init__(self, api_key: Optional[str] = None, language_code: str = "en-IN"):
        self.api_key = api_key
        self.language_code = language_code

    @abstractmethod
    async def transcribe_audio(self, pcm_bytes: bytes, sample_rate: int = 8000) -> Dict[str, Any]:
        """
        Transcribes raw audio bytes into text string.
        Returns dict with keys: {"text": str, "language": str, "confidence": float}
        """
        pass
