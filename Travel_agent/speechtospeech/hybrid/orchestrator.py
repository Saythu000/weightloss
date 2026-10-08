"""
DiarizationOrchestrator & Dual-Route Audio Streaming Pipeline
Manages real-time bi-directional voice streams over WebSockets (Twilio Media Streams / WebRTC).
Coordinates VAD barge-in detection, speech transcription, agent response generation, and TTS synthesis.
"""

from typing import Dict, Any, Optional, Callable, Awaitable
import asyncio
import logging

from speechtospeech.audioprocessor import AudioProcessor
from speechtospeech.webvad import WebVADManager
from speechtospeech.hybrid.audio_manager import AudioStreamManager
from speechtospeech.hybrid.stt_provider import SpeechProviderFactory
from speechtospeech.signal import SignalBus, SignalType

logger = logging.getLogger("Trekatour.Speech.Orchestrator")


class DiarizationOrchestrator:
    """
    Real-Time Voice Call Diarization & Audio Streaming Orchestrator.
    Connects live WebSockets to STT, VoiceAgent ReAct Loop, and TTS Output.
    """

    def __init__(
        self,
        session_id: str,
        stt_provider_name: str = "sarvam",
        tts_provider_name: str = "sarvam",
        stt_api_key: Optional[str] = None,
        tts_api_key: Optional[str] = None,
        on_text_transcribed: Optional[Callable[[str], Awaitable[str]]] = None,
    ):
        self.session_id = session_id
        self.signal_bus = SignalBus()

        self.audio_manager = AudioStreamManager(sample_rate=8000)
        self.stt_engine = SpeechProviderFactory.get_stt_provider(
            provider_name=stt_provider_name, api_key=stt_api_key
        )
        self.tts_engine = SpeechProviderFactory.get_tts_provider(
            provider_name=tts_provider_name, api_key=tts_api_key
        )

        self.on_text_transcribed = on_text_transcribed
        self.is_active = True
        self.pcm_accumulator = bytearray()

        self.vad = WebVADManager(
            rms_threshold=400,
            on_speech_start=self._handle_speech_start,
            on_speech_end=self._handle_speech_end,
            on_barge_in=self._handle_barge_in,
        )

    async def _handle_speech_start(self):
        """Triggered when customer begins speaking."""
        await self.signal_bus.emit(SignalType.SPEECH_STARTED)

    async def _handle_speech_end(self):
        """Triggered when customer stops speaking. Runs STT transcription & Agent response."""
        await self.signal_bus.emit(SignalType.SPEECH_STOPPED)
        if not self.pcm_accumulator:
            return

        speech_data = bytes(self.pcm_accumulator)
        self.pcm_accumulator.clear()

        logger.info(f"Session {self.session_id}: Transcribing {len(speech_data)} bytes of user speech...")
        transcription_res = await self.stt_engine.transcribe_audio(speech_data)
        user_text = transcription_res.get("text", "").strip()

        if not user_text:
            return

        logger.info(f"User ({self.session_id}): '{user_text}'")

        # Invoke Agent ReAct Loop if callback provided
        if self.on_text_transcribed:
            agent_response_text = await self.on_text_transcribed(user_text)
            if agent_response_text:
                await self.synthesize_and_stream_response(agent_response_text)

    async def _handle_barge_in(self):
        """Triggered when customer interrupts AI playback."""
        await self.signal_bus.emit(SignalType.BARGE_IN_TRIGGERED)
        self.audio_manager.clear_output_queue()
        self.vad.set_ai_speaking(False)

    async def process_incoming_mulaw_frame(self, mulaw_b64: str) -> None:
        """
        Receives raw base64 G.711 mu-law frame from Twilio WebSocket and passes to VAD & STT accumulator.
        """
        if not self.is_active:
            return

        mulaw_bytes = AudioProcessor.base64_to_mulaw(mulaw_b64)
        pcm_bytes = AudioProcessor.mulaw_to_pcm16(mulaw_bytes)

        # Run VAD check
        is_speech = await self.vad.process_frame(pcm_bytes)
        if is_speech:
            self.pcm_accumulator.extend(pcm_bytes)

    async def synthesize_and_stream_response(self, text: str) -> None:
        """
        Converts agent response text into TTS audio and pushes to output stream queue.
        """
        logger.info(f"Synthesizing AI TTS for ({self.session_id}): '{text[:60]}...'")
        self.vad.set_ai_speaking(True)
        await self.signal_bus.emit(SignalType.TTS_PLAYBACK_STARTED)

        raw_audio_bytes = await self.tts_engine.synthesize_speech(text)
        if not raw_audio_bytes:
            self.vad.set_ai_speaking(False)
            return

        # Encode synthesized audio into mu-law base64 chunks for Twilio
        mulaw_bytes = AudioProcessor.pcm16_to_mulaw(raw_audio_bytes) if len(raw_audio_bytes) > 0 else b""
        b64_output = AudioProcessor.mulaw_to_base64(mulaw_bytes)

        await self.audio_manager.enqueue_output_audio(b64_output.encode("utf-8"))
        await self.signal_bus.emit(SignalType.TTS_PLAYBACK_STOPPED)
        self.vad.set_ai_speaking(False)

    def close(self):
        """Terminates orchestrator session."""
        self.is_active = False
        self.audio_manager.clear_output_queue()
        self.audio_manager.clear_input_buffer()
