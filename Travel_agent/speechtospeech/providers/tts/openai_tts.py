"""
OpenAI Text-to-Speech (TTS) Provider
Supports tts-1 and tts-1-hd models with Nova, Alloy, and Echo voices.
"""

from typing import Optional
import httpx
import logging
from speechtospeech.providers.tts.base_tts import BaseTTSProvider

logger = logging.getLogger("Trekatour.Speech.OpenAITTS")


class OpenAITTSProvider(BaseTTSProvider):
    """OpenAI TTS API Provider."""

    OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech"

    async def synthesize_speech(self, text: str, target_sample_rate: int = 8000) -> bytes:
        if not text.strip() or not self.api_key:
            return b""

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "tts-1",
            "input": text,
            "voice": self.voice_id if self.voice_id in ["nova", "alloy", "echo", "shimmer"] else "nova",
            "response_format": "pcm",
            "speed": 1.05,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(self.OPENAI_TTS_URL, headers=headers, json=payload)
                resp.raise_for_status()
                return resp.content
        except Exception as e:
            logger.error(f"OpenAI TTS API error: {e}")
            return b""
