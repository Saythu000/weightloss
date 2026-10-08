"""
Base Abstract Class for Text-to-Speech (TTS) Providers
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class BaseTTSProvider(ABC):
    """Abstract interface for TTS engines (Sarvam AI, OpenAI TTS, Groq, ElevenLabs)."""

    def __init__(self, api_key: Optional[str] = None, voice_id: str = "female_indian"):
        self.api_key = api_key
        self.voice_id = voice_id

    @abstractmethod
    async def synthesize_speech(self, text: str, target_sample_rate: int = 8000) -> bytes:
        """
        Synthesizes text string into audio bytes (e.g. PCM or mu-law).
        Returns raw audio bytes.
        """
        pass
