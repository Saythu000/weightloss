"""
Sarvam AI Speech-to-Text (STT) Provider
Optimized for Indian Accent & Vernacular Languages (Hindi, Telugu, Hinglish, English).
"""

from typing import Dict, Any, Optional
import httpx
import logging
from speechtospeech.providers.stt.base_stt import BaseSTTProvider

logger = logging.getLogger("Trekatour.Speech.SarvamSTT")


class SarvamSTTProvider(BaseSTTProvider):
    """Sarvam AI Speech Recognition Provider."""

    SARVAM_API_URL = "https://api.sarvam.ai/speech-to-text"

    async def transcribe_audio(self, pcm_bytes: bytes, sample_rate: int = 8000) -> Dict[str, Any]:
        if not self.api_key:
            logger.warning("Sarvam API key missing. Returning fallback transcript.")
            return {"text": "", "language": self.language_code, "confidence": 0.0}

        headers = {"api-subscription-key": self.api_key}
        files = {"file": ("speech.wav", pcm_bytes, "audio/wav")}
        data = {"model": "saarika:v1", "language_code": self.language_code}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(self.SARVAM_API_URL, headers=headers, files=files, data=data)
                resp.raise_for_status()
                result = resp.json()
                transcript = result.get("transcript", "")
                return {
                    "text": transcript,
                    "language": result.get("language_code", self.language_code),
                    "confidence": result.get("confidence", 0.95),
                }
        except Exception as e:
            logger.error(f"Sarvam STT transcription API error: {e}")
            return {"text": "", "language": self.language_code, "confidence": 0.0}
