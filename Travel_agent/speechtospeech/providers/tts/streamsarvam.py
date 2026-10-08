from __future__ import annotations
import asyncio
import logging
from typing import Optional

logger = logging.getLogger("Trekatour.Speech.SarvamStreamingTTS")

try:
    from sarvamai import AsyncSarvamAI
    _SARVAM_AVAILABLE = True
except ImportError:
    _SARVAM_AVAILABLE = False
    logger.warning("sarvamai package not found. Streaming TTS will operate in fallback mode.")


class SarvamStreamingTTSProvider:
    """Sarvam AI Streaming Text-to-Speech Provider."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        language_code: str = "en-IN",
        speaker: str = "meera",
        model: str = "bulbul:v3",
    ):
        self.api_key = api_key or ""
        self.language_code = language_code
        self.speaker = speaker
        self.model = model

        self.client = AsyncSarvamAI(api_subscription_key=self.api_key) if (_SARVAM_AVAILABLE and self.api_key) else None
        self.ctx = None
        self.socket = None
        self.lock = asyncio.Lock()

    async def connect(self):
        """Establishes a clean connection state, closing old contexts safely."""
        async with self.lock:
            await self._cleanup()

            if not self.client:
                logger.info("Sarvam TTS client offline or missing key.")
                return

            logger.info("Connecting to Sarvam TTS WebSocket...")
            try:
                self.ctx = self.client.text_to_speech_streaming.connect(
                    model=self.model,
                    send_completion_event=True
                )
                self.socket = await self.ctx.__aenter__()

                await self.socket.configure(
                    target_language_code=self.language_code,
                    speaker=self.speaker,
                    speech_sample_rate=24000,
                    output_audio_codec="wav",
                )
                logger.info("TTS Connected & Configured")
            except Exception as e:
                logger.error(f"Failed to build TTS socket connection: {e}")
                await self._cleanup()

    async def update_config(self, language_code: str, speaker: Optional[str] = None):
        self.language_code = language_code
        if speaker:
            self.speaker = speaker
        if self.socket:
            await self.socket.configure(
                target_language_code=self.language_code,
                speaker=self.speaker,
                speech_sample_rate=24000,
                output_audio_codec="wav",
            )

    async def ensure_connected(self):
        """Lazy connection guard utility."""
        if self.socket is None and self.client:
            await self.connect()

    async def send_text(self, text: str):
        if not text.strip():
            return

        try:
            await self.ensure_connected()
            if self.socket:
                await self.socket.convert(text)
        except Exception as e:
            logger.warning(f"TTS convert error, attempting recovery: {e}")
            await self.connect()
            if self.socket:
                await self.socket.convert(text)

    async def receive_audio(self):
        try:
            await self.ensure_connected()
            if not self.socket:
                return None

            res = await self.socket.recv()
            if res and getattr(res, "type", None) == "error":
                code = getattr(res.data, "code", None) if hasattr(res, "data") else None
                if code == 408:
                    logger.info("Caught idle session timeout notification (408).")
                    await self.close()
            return res
        except Exception as e:
            if "closed" in str(e).lower() or "1000" in str(e) or "none" in str(e).lower():
                await self.close()
            return None

    async def flush(self):
        if self.socket:
            try:
                await self.socket.flush()
            except Exception:
                pass

    async def _cleanup(self):
        """Internal low-level resetting utility."""
        if self.ctx:
            try:
                await self.ctx.__aexit__(None, None, None)
            except Exception:
                pass
        self.ctx = None
        self.socket = None

    async def close(self):
        """Safely cleans up execution variables and exits active connection contexts."""
        async with self.lock:
            await self._cleanup()
            logger.info("TTS Connection Reference Cleared")
