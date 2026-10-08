"""
Sarvam AI Text-to-Speech (TTS) Provider (Bulbul v1)
Generates natural Indian accent voice responses for customer outreach.
"""

from typing import Optional
import httpx
import base64
import logging
from speechtospeech.providers.tts.base_tts import BaseTTSProvider

logger = logging.getLogger("Trekatour.Speech.SarvamTTS")


class SarvamTTSProvider(BaseTTSProvider):
    """Sarvam AI Bulbul TTS Provider."""

    SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"

    async def synthesize_speech(self, text: str, target_sample_rate: int = 8000) -> bytes:
        if not text.strip() or not self.api_key:
            return b""

        headers = {"api-subscription-key": self.api_key, "Content-Type": "application/json"}
        payload = {
            "inputs": [text],
            "target_language_code": "hi-IN",
            "speaker": "meera",
            "pitch": 0,
            "pace": 1.1,
            "loudness": 1.5,
            "speech_sample_rate": target_sample_rate,
            "enable_preprocessing": True,
            "model": "bulbul:v1",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(self.SARVAM_TTS_URL, headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()
                audios = data.get("audios", [])
                if audios:
                    return base64.b64decode(audios[0])
        except Exception as e:
            logger.error(f"Sarvam TTS synthesis error: {e}")
        return b""
