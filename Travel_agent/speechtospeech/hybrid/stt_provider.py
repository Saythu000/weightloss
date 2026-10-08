"""
STT & TTS Provider Factory Resolver
Instantiates requested provider engines (Sarvam AI, OpenAI, Groq, HuggingFace) based on runtime config.
"""

from typing import Optional
import logging
from speechtospeech.providers.stt.base_stt import BaseSTTProvider
from speechtospeech.providers.stt.sarvam_stt import SarvamSTTProvider
from speechtospeech.providers.stt.whisper_stt import OpenAIWhisperSTTProvider, GroqWhisperSTTProvider

from speechtospeech.providers.tts.base_tts import BaseTTSProvider
from speechtospeech.providers.tts.sarvam_tts import SarvamTTSProvider
from speechtospeech.providers.tts.openai_tts import OpenAITTSProvider

logger = logging.getLogger("Trekatour.Speech.ProviderFactory")


class SpeechProviderFactory:
    """
    Factory helper for building STT & TTS instances based on configuration keys.
    """

    @staticmethod
    def get_stt_provider(
        provider_name: str = "sarvam", api_key: Optional[str] = None, language_code: str = "en-IN"
    ) -> BaseSTTProvider:
        name = provider_name.lower().strip()
        if name == "sarvam":
            return SarvamSTTProvider(api_key=api_key, language_code=language_code)
        elif name == "groq":
            return GroqWhisperSTTProvider(api_key=api_key, language_code=language_code)
        elif name in ["openai", "whisper"]:
            return OpenAIWhisperSTTProvider(api_key=api_key, language_code=language_code)
        
        logger.info(f"Unknown STT provider '{provider_name}'. Falling back to Sarvam STT.")
        return SarvamSTTProvider(api_key=api_key, language_code=language_code)

    @staticmethod
    def get_tts_provider(
        provider_name: str = "sarvam", api_key: Optional[str] = None, voice_id: str = "female_indian"
    ) -> BaseTTSProvider:
        name = provider_name.lower().strip()
        if name == "sarvam":
            return SarvamTTSProvider(api_key=api_key, voice_id=voice_id)
        elif name == "openai":
            return OpenAITTSProvider(api_key=api_key, voice_id=voice_id)

        logger.info(f"Unknown TTS provider '{provider_name}'. Falling back to Sarvam TTS.")
        return SarvamTTSProvider(api_key=api_key, voice_id=voice_id)
