"""
Speech-to-Speech Audio Signal Event Bus
Dispatches real-time events for VAD speech detection, barge-in interruptions, and TTS playback status.
"""

from typing import Callable, List, Dict, Any, Awaitable
from enum import Enum
import asyncio
import logging

logger = logging.getLogger("Trekatour.Speech.Signal")


class SignalType(str, Enum):
    SPEECH_STARTED = "speech_started"
    SPEECH_STOPPED = "speech_stopped"
    BARGE_IN_TRIGGERED = "barge_in_triggered"
    TTS_PLAYBACK_STARTED = "tts_playback_started"
    TTS_PLAYBACK_STOPPED = "tts_playback_stopped"
    DIARIZATION_SPEAKER_CHANGE = "diarization_speaker_change"


class SignalBus:
    """
    Async pub-sub signal bus for real-time audio pipeline events.
    """

    def __init__(self):
        self._subscribers: Dict[SignalType, List[Callable[[Dict[str, Any]], Awaitable[None]]]] = {
            sig: [] for sig in SignalType
        }

    def subscribe(self, signal_type: SignalType, callback: Callable[[Dict[str, Any]], Awaitable[None]]):
        """Subscribes an async callback handler to a signal type."""
        self._subscribers[signal_type].append(callback)

    async def emit(self, signal_type: SignalType, data: Optional[Dict[str, Any]] = None):
        """Emits a signal to all registered subscribers asynchronously."""
        payload = data or {}
        callbacks = self._subscribers.get(signal_type, [])
        for cb in callbacks:
            try:
                if asyncio.iscoroutinefunction(cb):
                    await cb(payload)
                else:
                    cb(payload)
            except Exception as e:
                logger.error(f"Error in signal subscriber callback for {signal_type}: {e}")
