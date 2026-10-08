"""
Audio Processing & Format Conversion Engine
Handles PCM 16-bit 8kHz/16kHz resampling, G.711 mu-law encoding/decoding for Twilio Telephony streams.
"""

from typing import Union
import audioop
import base64


class AudioProcessor:
    """
    Audio codec converter and signal normalizer for real-time voice streaming.
    """

    @staticmethod
    def mulaw_to_pcm16(mulaw_bytes: bytes) -> bytes:
        """Decodes Twilio G.711 mu-law audio to 16-bit PCM (8kHz)."""
        return audioop.ulaw2lin(mulaw_bytes, 2)

    @staticmethod
    def pcm16_to_mulaw(pcm_bytes: bytes) -> bytes:
        """Encodes 16-bit PCM audio (8kHz) to Twilio G.711 mu-law."""
        return audioop.lin2ulaw(pcm_bytes, 2)

    @staticmethod
    def resample(pcm_bytes: bytes, in_rate: int = 8000, out_rate: int = 16000) -> bytes:
        """Resamples PCM 16-bit audio from in_rate to out_rate."""
        if in_rate == out_rate:
            return pcm_bytes
        resampled, _ = audioop.ratecv(pcm_bytes, 2, 1, in_rate, out_rate, None)
        return resampled

    @staticmethod
    def base64_to_mulaw(b64_str: str) -> bytes:
        """Decodes base64 payload to raw mu-law bytes."""
        return base64.b64decode(b64_str)

    @staticmethod
    def mulaw_to_base64(mulaw_bytes: bytes) -> str:
        """Encodes mu-law bytes to base64 string for Twilio WebSocket frame."""
        return base64.b64encode(mulaw_bytes).decode("ascii")

    @staticmethod
    def calculate_rms(pcm_bytes: bytes) -> int:
        """Calculates Root-Mean-Square (RMS) audio signal amplitude/volume."""
        if not pcm_bytes:
            return 0
        return audioop.rms(pcm_bytes, 2)
