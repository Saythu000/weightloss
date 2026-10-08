"""
Full-Duplex Speech-to-Speech WebSocket Router with Barge-In Interruption Handling.
Supports both direct Web browser mic audio (PCM) and Twilio telephony streams (mu-law).
Reuses colleague's orchestrator and low-latency streaming pipeline.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import logging
import base64
import json
import re
import time
from typing import Optional

from customagents.voiceagent.agent import create_voice_agent, VoiceSalesAgent
from customagents.voiceagent.session import VoiceSession, translate_text
from speechtospeech.providers.stt.streamsarvam import SarvamStreamingSTTProvider
from speechtospeech.providers.tts.streamsarvam import SarvamStreamingTTSProvider
from config.config import config

logger = logging.getLogger("Trekatour.VoiceWS")
router = APIRouter(prefix="/ws", tags=["Voice Telephony Stream"])

# Unicode script patterns for Indian language auto-detection
_SCRIPT_MAP = [
    (r'[\u0B80-\u0BFF]', "ta-IN"),  # Tamil
    (r'[\u0900-\u097F]', "hi-IN"),  # Hindi / Devanagari
    (r'[\u0C00-\u0C7F]', "te-IN"),  # Telugu
    (r'[\u0C80-\u0CFF]', "kn-IN"),  # Kannada
    (r'[\u0D00-\u0D7F]', "ml-IN"),  # Malayalam
    (r'[\u0980-\u09FF]', "bn-IN"),  # Bengali
    (r'[\u0A80-\u0AFF]', "gu-IN"),  # Gujarati
]


def detect_language(text: str) -> Optional[str]:
    if not text:
        return None
    for pattern, lang_code in _SCRIPT_MAP:
        if re.search(pattern, text):
            return lang_code
    return None


@router.websocket("/voice/stream")
async def voice_stream_endpoint(ws: WebSocket):
    """
    Full-duplex WebSocket stream for browser mic or live telephony.
    Features:
    - Real-time STT streaming (Sarvam AI)
    - Multilingual Indian language detection & translation
    - Punctuation-buffered sentence audio streaming (Sarvam TTS)
    - Instant Barge-In Interruption: caller speech interrupts active bot output
    """
    await ws.accept()
    logger.info("Voice Stream WebSocket connected.")

    voice_agent = create_voice_agent(config=config)
    sarvam_key = getattr(config, "sarvam_api_key", None)

    stt = SarvamStreamingSTTProvider(api_key=sarvam_key)
    tts = SarvamStreamingTTSProvider(api_key=sarvam_key, speaker="meera")
    voice_session = VoiceSession(agent=voice_agent, tts=tts)

    await asyncio.gather(stt.connect(), tts.connect())

    caller_language = "en-IN"
    transcript_queue = asyncio.Queue()
    active_response_task = None
    ws_lock = asyncio.Lock()
    is_connected = True

    async def safe_send_json(payload: dict):
        nonlocal is_connected
        if not is_connected:
            return
        async with ws_lock:
            try:
                await ws.send_json(payload)
            except Exception:
                is_connected = False

    async def safe_send_text(text: str):
        nonlocal is_connected
        if not is_connected:
            return
        async with ws_lock:
            try:
                await ws.send_text(text)
            except Exception:
                is_connected = False

    async def receive_audio():
        nonlocal is_connected
        try:
            while is_connected:
                msg = await ws.receive()
                if "bytes" in msg and msg["bytes"]:
                    await stt.send_audio(msg["bytes"])
                elif "text" in msg and msg["text"]:
                    try:
                        data = json.loads(msg["text"])
                        # Twilio format support
                        if data.get("event") == "media":
                            payload_b64 = data.get("media", {}).get("payload")
                            if payload_b64:
                                raw_bytes = base64.b64decode(payload_b64)
                                await stt.send_audio(raw_bytes)
                        elif data.get("type") == "audio_chunk":
                            raw_b64 = data.get("data")
                            if raw_b64:
                                await stt.send_audio(base64.b64decode(raw_b64))
                        elif data.get("type") == "user_text":
                            # Direct text simulation from test runner or chat
                            await transcript_queue.put(data.get("text", ""))
                    except json.JSONDecodeError:
                        pass
        except WebSocketDisconnect:
            is_connected = False
        except Exception as e:
            logger.error(f"Error in receive_audio: {e}")
            is_connected = False

    async def process_transcripts():
        nonlocal caller_language, is_connected
        try:
            async for t_data in stt.stream_transcripts():
                if not is_connected:
                    break
                text = t_data.get("text", "").strip()
                if not text:
                    continue

                detected = t_data.get("language") or detect_language(text)
                if detected and detected != caller_language and detected != "unknown":
                    caller_language = detected
                    await tts.update_config(language_code=caller_language)

                await safe_send_json({"type": "transcript", "text": text, "language": caller_language})
                await transcript_queue.put(text)
        except Exception as e:
            logger.error(f"Error in process_transcripts: {e}")

    async def dispatch_responses():
        nonlocal active_response_task, is_connected
        while is_connected:
            try:
                text = await transcript_queue.get()
                if not text:
                    continue

                # Barge-in Interruption: Stop active bot speech if user interrupts
                if active_response_task and not active_response_task.done():
                    logger.info("Barge-in: Interrupting active bot speech for new caller utterance.")
                    active_response_task.cancel()
                    try:
                        await active_response_task
                    except asyncio.CancelledError:
                        pass
                    await tts.flush()

                async def stream_reply():
                    try:
                        async for res in voice_session.process_transcript_to_audio(
                            text, target_language=caller_language
                        ):
                            if not is_connected:
                                break
                            if res.get("type") == "text":
                                await safe_send_json({"type": "text", "text": res["content"]})
                            elif res.get("type") == "audio":
                                b64 = base64.b64encode(res["content"]).decode("utf-8")
                                await safe_send_json({"type": "audio", "audio": b64})
                    except asyncio.CancelledError:
                        logger.info("Bot speech stream cancelled due to barge-in.")
                    except Exception as err:
                        logger.error(f"Error streaming voice response: {err}")

                active_response_task = asyncio.create_task(stream_reply())
                transcript_queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in dispatch_responses: {e}")

    try:
        await asyncio.gather(
            receive_audio(),
            process_transcripts(),
            dispatch_responses(),
        )
    except (WebSocketDisconnect, asyncio.CancelledError):
        logger.info("Voice stream disconnected gracefully.")
    finally:
        is_connected = False
        if active_response_task and not active_response_task.done():
            active_response_task.cancel()
        await stt.close()
        await tts.close()
