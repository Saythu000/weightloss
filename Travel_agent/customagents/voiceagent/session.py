from __future__ import annotations
import re
import base64
import logging
from typing import AsyncGenerator, Optional, Any
from agent.events import EventType

logger = logging.getLogger("Trekatour.VoiceAgent.Session")

LANGUAGE_MAP = {
    "en-IN": "English", "ta-IN": "Tamil", "hi-IN": "Hindi",
    "ml-IN": "Malayalam", "te-IN": "Telugu", "kn-IN": "Kannada",
    "bn-IN": "Bengali", "gu-IN": "Gujarati", "mr-IN": "Marathi",
    "en": "English", "ta": "Tamil", "hi": "Hindi",
    "ml": "Malayalam", "te": "Telugu", "kn": "Kannada",
}


async def translate_text(
    client: Any,
    text: str,
    target_language: str,
    source_language: str = "en"
) -> str:
    """Translate text between Indian languages and English using LLM."""
    if not target_language or not text or target_language == source_language:
        return text

    source_name = LANGUAGE_MAP.get(source_language, source_language)
    target_name = LANGUAGE_MAP.get(target_language, target_language)

    prompt = (
        f"Translate the following {source_name} text to conversational {target_name} for a phone call. "
        "Return ONLY the spoken translation, no notes, no markdown, no quotes."
    )
    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": text},
    ]

    try:
        if hasattr(client, "generate"):
            resp = await client.generate(messages=messages, temperature=0.2)
            translated = resp.content
        elif hasattr(client, "complete"):
            translated = await client.complete(messages, temperature=0.2)
        elif hasattr(client, "chat_completion"):
            translated = ""
            async for event in client.chat_completion(messages, stream=False):
                if hasattr(event, "text_delta") and event.text_delta:
                    translated += event.text_delta.content
        else:
            return text

        return translated.strip() if translated else text
    except Exception as e:
        logger.error(f"Voice translation error: {e}")
        return text


class VoiceSession:
    """
    Manages low-latency token streaming to speech synthesis (TTS).
    Punctuation chunk buffering delivers near-instant voice playback to callers.
    Ported directly from colleague's refactoragent-master architecture.
    """

    def __init__(self, agent: Any, tts: Any):
        self.agent = agent
        self.tts = tts

    async def _translate_to(self, text: str, target_language: str) -> str:
        if not target_language or target_language in ("en-IN", "en", "", None):
            return text
        client = getattr(self.agent, "llm_client", None)
        if not client and hasattr(self.agent, "session") and hasattr(self.agent.session, "client"):
            client = self.agent.session.client
        return await translate_text(
            client, text,
            target_language=target_language, source_language="en"
        )

    async def _drain_tts(self) -> AsyncGenerator[bytes, None]:
        """Yields raw audio PCM/WAV chunks as they are synthesized."""
        while True:
            try:
                res = await self.tts.receive_audio()
                if res is None:
                    break
                if hasattr(res, "type") and res.type == "event":
                    event_data = getattr(res, "data", None)
                    if event_data and getattr(event_data, "event_type", None) == "final":
                        break
                if hasattr(res, "data") and res.data and hasattr(res.data, "audio"):
                    if res.data.audio:
                        yield base64.b64decode(res.data.audio)
            except Exception as e:
                logger.error(f"TTS Drain Error: {e}")
                break

    async def process_transcript_to_audio(
        self, transcript: str, target_language: str = "en-IN"
    ) -> AsyncGenerator[dict, None]:
        """
        Streams LLM text tokens and dispatches sentence chunks to TTS as soon
        as punctuation (. ! ?) is reached with min length threshold.
        """
        buffer = ""
        tts_buffer = ""
        text_buffer = ""

        session_ctx = getattr(self.agent, "session", None)
        agent_gen = self.agent.run(transcript, session=session_ctx) if session_ctx is not None else self.agent.run(transcript)

        async for event in agent_gen:
            ev_type = getattr(event, "type", None)
            if ev_type in (EventType.TEXT_DELTA, "text_delta"):
                token = getattr(event, "content", "")
                if not token and hasattr(event, "data") and isinstance(event.data, dict):
                    token = event.data.get("content", "")

                buffer += token
                tts_buffer += token
                text_buffer += token

                total_len = len(tts_buffer.strip())
                has_punct = bool(re.search(r"[.!?]\s*$", buffer))

                # Colleague's low-latency chunk threshold:
                # 15+ chars with punctuation, or 40+ chars with a space
                should_process = (
                    (has_punct and total_len >= 15) or
                    (total_len >= 40 and " " in buffer)
                )

                if should_process:
                    text_to_speak = tts_buffer.strip()
                    chunk_text = text_buffer.strip()
                    tts_buffer = ""
                    buffer = ""
                    text_buffer = ""

                    if text_to_speak:
                        if chunk_text:
                            yield {"type": "text", "content": chunk_text + " "}
                        translated = await self._translate_to(text_to_speak, target_language)
                        await self.tts.send_text(translated)
                        await self.tts.flush()
                        async for audio_bytes in self._drain_tts():
                            yield {"type": "audio", "content": audio_bytes}
                elif has_punct:
                    buffer = ""

        # Flush any remaining buffer at the end of the turn
        remaining = tts_buffer.strip() or buffer.strip()
        if remaining:
            chunk_text = text_buffer.strip()
            if chunk_text:
                yield {"type": "text", "content": chunk_text}
            translated = await self._translate_to(remaining, target_language)
            await self.tts.send_text(translated)
            await self.tts.flush()
            async for audio_bytes in self._drain_tts():
                yield {"type": "audio", "content": audio_bytes}

    async def text_to_audio(self, text: str) -> AsyncGenerator[bytes, None]:
        await self.tts.send_text(text)
        await self.tts.flush()
        async for audio_bytes in self._drain_tts():
            yield audio_bytes
