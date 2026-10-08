"""
OpenAI Whisper & Groq Whisper Speech-to-Text (STT) Providers
High-speed multilingual transcription engines.
"""

from typing import Dict, Any, Optional
import httpx
import logging
from speechtospeech.providers.stt.base_stt import BaseSTTProvider

logger = logging.getLogger("Trekatour.Speech.WhisperSTT")


class OpenAIWhisperSTTProvider(BaseSTTProvider):
    """OpenAI Whisper Speech-to-Text Provider."""

    OPENAI_API_URL = "https://api.openai.com/v1/audio/transcriptions"

    async def transcribe_audio(self, pcm_bytes: bytes, sample_rate: int = 8000) -> Dict[str, Any]:
        if not self.api_key:
            return {"text": "", "language": "en", "confidence": 0.0}

        headers = {"Authorization": f"Bearer {self.api_key}"}
        files = {"file": ("audio.wav", pcm_bytes, "audio/wav")}
        data = {"model": "whisper-1", "response_format": "json"}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(self.OPENAI_API_URL, headers=headers, files=files, data=data)
                resp.raise_for_status()
                result = resp.json()
                return {
                    "text": result.get("text", ""),
                    "language": result.get("language", "en"),
                    "confidence": 0.9,
                }
        except Exception as e:
            logger.error(f"OpenAI Whisper STT API error: {e}")
            return {"text": "", "language": "en", "confidence": 0.0}


class GroqWhisperSTTProvider(BaseSTTProvider):
    """Groq Ultra-Fast Whisper-Large-V3 Speech-to-Text Provider."""

    GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions"

    async def transcribe_audio(self, pcm_bytes: bytes, sample_rate: int = 8000) -> Dict[str, Any]:
        if not self.api_key:
            return {"text": "", "language": "en", "confidence": 0.0}

        headers = {"Authorization": f"Bearer {self.api_key}"}
        files = {"file": ("audio.wav", pcm_bytes, "audio/wav")}
        data = {"model": "whisper-large-v3", "response_format": "json"}

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(self.GROQ_API_URL, headers=headers, files=files, data=data)
                resp.raise_for_status()
                result = resp.json()
                return {
                    "text": result.get("text", ""),
                    "language": result.get("language", "en"),
                    "confidence": 0.95,
                }
        except Exception as e:
            logger.error(f"Groq Whisper STT API error: {e}")
            return {"text": "", "language": "en", "confidence": 0.0}
