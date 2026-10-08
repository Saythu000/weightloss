"""
Rock-Solid Real-Time Voice Agent Call Bridge (Telugu & English)
Powered by Sarvam AI (saaras:v3 STT + bulbul:v3 TTS) and Groq LLM (Aanya)
"""

import asyncio
import os
import sys
import subprocess
import httpx
import base64
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from customagents.voiceagent.agent import create_voice_agent
from speechtospeech.providers.stt.streamsarvam import SarvamStreamingSTTProvider
from config.config import config


async def synthesize_speech(text: str, language_code: str = "en-IN") -> bytes:
    """High-reliability Sarvam TTS synthesis with zero WebSocket connection drops."""
    if not text.strip():
        return b""

    # Map language code
    target_lang = "te-IN" if ("te" in language_code) else "en-IN"
    speaker = "neha"

    headers = {
        "api-subscription-key": config.sarvam_api_key,
        "Content-Type": "application/json"
    }
    payload = {
        "inputs": [text],
        "target_language_code": target_lang,
        "speaker": speaker,
        "model": "bulbul:v3"
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post("https://api.sarvam.ai/text-to-speech", headers=headers, json=payload)
            if resp.status_code == 200:
                audios = resp.json().get("audios", [])
                if audios:
                    return base64.b64decode(audios[0])
    except Exception as e:
        print(f"[TTS Error]: {e}")
    return b""


async def main():
    print("\n" + "=" * 65)
    print("📞 TREKATOUR AI VOICE AGENT — TELUGU & ENGLISH LIVE BRIDGE")
    print("📱 Connected Phone   : motorola edge 60 pro")
    print("🤖 Agent Persona     : Aanya (Senior Travel Advisor, Trekatour)")
    print("🗣️ Languages Active  : Telugu (te-IN) & English (en-IN)")
    print("🎙️ Speech-to-Text    : Sarvam AI saaras:v3 (16kHz Streaming)")
    print("🔊 Text-to-Speech    : Sarvam AI bulbul:v3 (Voice: neha)")
    print("🧠 Reasoning Engine  : Groq LLM (groq/compound)")
    print("=" * 65)

    voice_agent = create_voice_agent(config=config)
    sarvam_key = config.sarvam_api_key

    loop = asyncio.get_running_loop()
    is_running = True

    while is_running:
        stt = SarvamStreamingSTTProvider(api_key=sarvam_key, sample_rate=16000)
        try:
            await stt.connect()
            print("\n✅ [READY] Sarvam AI Voice Engine Active & Listening!")
            print("👉 You can speak in TELUGU or ENGLISH now.\n")
        except Exception as e:
            print(f"Connection retry: {e}")
            await asyncio.sleep(2)
            continue

        rec_cmd = ["pw-record", "--rate", "16000", "--channels", "1", "--format", "s16", "-"]
        rec_proc = subprocess.Popen(rec_cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)

        is_speaking = False

        async def audio_streamer():
            chunk_size = 3200
            while is_running and rec_proc.poll() is None:
                try:
                    data = await loop.run_in_executor(None, rec_proc.stdout.read, chunk_size)
                    if not data:
                        break
                    if not is_speaking:
                        await stt.send_audio(data)
                except Exception:
                    break

        async def transcript_consumer():
            nonlocal is_speaking
            try:
                async for t_data in stt.stream_transcripts():
                    if not is_running:
                        break
                    text = t_data.get("text", "").strip()
                    if not text:
                        continue

                    lang = t_data.get("language", "en-IN")
                    if "te" in lang:
                        lang = "te-IN"
                        lang_name = "Telugu"
                    else:
                        lang = "en-IN"
                        lang_name = "English"

                    print("\n" + "-" * 55)
                    print(f"👤 YOU ({lang_name}): \"{text}\"")
                    print("🤖 Aanya is formulating response...")

                    # Generate LLM response
                    reply_text = ""
                    prompt_turn = text
                    if lang == "te-IN":
                        prompt_turn = f"[Respond in Telugu language naturally]: {text}"

                    async for event in voice_agent.run(prompt_turn):
                        if event.type == "text_delta":
                            reply_text += event.content

                    clean_reply = reply_text.strip()
                    if not clean_reply:
                        clean_reply = "నమస్కారం! నేను త్రేకటూర్ నుండి ఆన్యను. మీరు ఏ ట్రిప్ గురించి తెలుసుకోవాలనుకుంటున్నారు?" if lang == "te-IN" else "Namaste! I am Aanya from Trekatour. Which destination would you like to explore?"

                    print(f"🗣️ AANYA: {clean_reply}")

                    # Synthesize and play audio
                    audio_bytes = await synthesize_speech(clean_reply, language_code=lang)
                    if audio_bytes:
                        is_speaking = True
                        print("🔊 Playing Aanya's voice (Headset + Laptop Speaker)...")
                        try:
                            def play_to_devices(data):
                                procs = []
                                for cmd in [["pw-play", "-"], ["pw-play", "--target", "57", "-"]]:
                                    try:
                                        p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)
                                        p.stdin.write(data)
                                        p.stdin.close()
                                        procs.append(p)
                                    except Exception:
                                        pass
                                for p in procs:
                                    p.wait()

                            await loop.run_in_executor(None, play_to_devices, audio_bytes)
                        finally:
                            await asyncio.sleep(0.5)
                            is_speaking = False

                    print("-" * 55)
                    print("🎙️ Listening for your reply (speak in Telugu or English)...")
            except Exception as ex:
                print(f"[Stream reconnecting]: {ex}")

        try:
            await asyncio.gather(audio_streamer(), transcript_consumer())
        except Exception:
            pass
        finally:
            rec_proc.terminate()
            await stt.close()
            await asyncio.sleep(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nSession stopped.")
