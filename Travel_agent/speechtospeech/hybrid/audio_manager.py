"""
Real-time Audio Streaming Buffer & Frame Collector
Manages incoming PCM frames, chunk accumulation, and output queue draining for streaming TTS/STT.
"""

from typing import List, Optional
import asyncio
import logging

logger = logging.getLogger("Trekatour.Speech.AudioManager")


class AudioStreamManager:
    """
    Manages dual-route streaming buffers for live audio calls.
    """

    def __init__(self, sample_rate: int = 8000, frame_size_ms: int = 20):
        self.sample_rate = sample_rate
        self.frame_size = int(sample_rate * (frame_size_ms / 1000.0) * 2)  # 16-bit = 2 bytes/sample
        self._input_buffer = bytearray()
        self._output_queue: asyncio.Queue[bytes] = asyncio.Queue()

    def push_input_bytes(self, pcm_bytes: bytes) -> List[bytes]:
        """
        Appends raw PCM audio bytes to input buffer.
        Returns a list of complete chunk frames (e.g. 20ms each).
        """
        self._input_buffer.extend(pcm_bytes)
        frames: List[bytes] = []

        while len(self._input_buffer) >= self.frame_size:
            frame = bytes(self._input_buffer[: self.frame_size])
            self._input_buffer = self._input_buffer[self.frame_size :]
            frames.append(frame)

        return frames

    async def enqueue_output_audio(self, audio_chunk: bytes):
        """Pushes synthesized TTS audio chunk to output queue."""
        await self._output_queue.put(audio_chunk)

    async def get_next_output_chunk(self) -> bytes:
        """Retrieves next synthesized audio chunk for WebSocket output."""
        return await self._output_queue.get()

    def clear_output_queue(self):
        """Flushes output queue immediately (used during barge-in interruptions)."""
        drained_count = 0
        while not self._output_queue.empty():
            try:
                self._output_queue.get_nowait()
                drained_count += 1
            except asyncio.QueueEmpty:
                break
        if drained_count > 0:
            logger.info(f"Drained {drained_count} audio chunks from playback queue due to interruption.")

    def clear_input_buffer(self):
        """Clears input buffer."""
        self._input_buffer.clear()
