"""
Voice Activity Detection (VAD) & Barge-in Interruption Manager
Monitors incoming PCM 16-bit audio frames for speech onset and offset to trigger instant AI playback cutoff.
"""

from typing import Optional, Callable, Awaitable
import logging
from speechtospeech.audioprocessor import AudioProcessor

logger = logging.getLogger("Trekatour.Speech.VAD")


class WebVADManager:
    """
    Real-Time Voice Activity Detection Engine for WebRTC / Telephony Streams.
    Uses RMS volume thresholding and continuous speech frame windows.
    """

    def __init__(
        self,
        rms_threshold: int = 500,
        consecutive_speech_frames: int = 3,
        consecutive_silence_frames: int = 15,
        on_speech_start: Optional[Callable[[], Awaitable[None]]] = None,
        on_speech_end: Optional[Callable[[], Awaitable[None]]] = None,
        on_barge_in: Optional[Callable[[], Awaitable[None]]] = None,
    ):
        self.rms_threshold = rms_threshold
        self.consecutive_speech_frames = consecutive_speech_frames
        self.consecutive_silence_frames = consecutive_silence_frames

        self.on_speech_start = on_speech_start
        self.on_speech_end = on_speech_end
        self.on_barge_in = on_barge_in

        self.is_speaking = False
        self.ai_is_speaking = False

        self._speech_count = 0
        self._silence_count = 0

    def set_ai_speaking(self, speaking: bool) -> None:
        """Flag indicating whether AI TTS is actively outputting audio."""
        self.ai_is_speaking = speaking

    async def process_frame(self, pcm_bytes: bytes) -> bool:
        """
        Processes an incoming raw 20ms PCM audio frame.
        Returns True if active human speech is detected.
        """
        rms = AudioProcessor.calculate_rms(pcm_bytes)

        if rms >= self.rms_threshold:
            self._speech_count += 1
            self._silence_count = 0

            if self._speech_count >= self.consecutive_speech_frames:
                if not self.is_speaking:
                    self.is_speaking = True
                    logger.debug(f"VAD: Human speech detected (RMS={rms})")
                    if self.on_speech_start:
                        await self.on_speech_start()

                # Trigger barge-in if human speaks while AI is talking
                if self.ai_is_speaking and self.on_barge_in:
                    logger.info("VAD: BARGE-IN TRIGGERED! Human interrupted AI playback.")
                    await self.on_barge_in()

            return True
        else:
            self._silence_count += 1
            if self._silence_count >= self.consecutive_silence_frames:
                if self.is_speaking:
                    self.is_speaking = False
                    self._speech_count = 0
                    logger.debug("VAD: Human speech ended (Silence threshold met)")
                    if self.on_speech_end:
                        await self.on_speech_end()
            return False
