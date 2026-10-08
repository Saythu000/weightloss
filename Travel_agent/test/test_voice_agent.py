"""
Voice Outreach Sub-Agent Unit Test Suite for Travel_agent
"""

import pytest
import asyncio
from client.llm_client import AsyncLLMClient
from customagents.voiceagent.agent import create_voice_agent, VoiceSalesAgent
from customagents.factory import AgentFactory


def test_voice_agent_initialization():
    async def _test():
        llm_client = AsyncLLMClient()
        voice_agent = create_voice_agent(llm_client)

        assert voice_agent is not None
        assert voice_agent.allowed_tool_names is not None
        assert "log_lead_status" in voice_agent.allowed_tool_names
        assert "search_itinerary" in voice_agent.allowed_tool_names
        assert "calculate_pricing" in voice_agent.allowed_tool_names
        assert "escalate_to_human" in voice_agent.allowed_tool_names

        # Factory test
        factory_agent = AgentFactory.create_agent("voice_agent", llm_client=llm_client)
        assert isinstance(factory_agent, VoiceSalesAgent)
        assert "log_lead_status" in factory_agent.allowed_tool_names

    asyncio.run(_test())


def test_language_detection():
    from api.wsrouters.voice_ws import detect_language
    assert detect_language("வணக்கம் எப்படி இருக்கிறீர்கள்?") == "ta-IN"  # Tamil
    assert detect_language("नमस्ते, क्या आप ट्रिप प्लान कर रहे हैं?") == "hi-IN"  # Hindi
    assert detect_language("హలో, మీరు ట్రిప్ వివరాలు చూస్తున్నారా?") == "te-IN"  # Telugu
    assert detect_language("Hello how are you?") is None


def test_voice_session_mock_stream():
    from customagents.voiceagent.session import VoiceSession
    from agent.events import AgentEvent, EventType

    class MockTTS:
        def __init__(self):
            self.sent_chunks = []
        async def send_text(self, text):
            self.sent_chunks.append(text)
        async def flush(self):
            pass
        async def receive_audio(self):
            return None

    class MockAgent:
        def __init__(self):
            self.llm_client = None
        async def run(self, transcript, session=None):
            yield AgentEvent(type=EventType.TEXT_DELTA, content="Namaste traveler! ")
            yield AgentEvent(type=EventType.TEXT_DELTA, content="Welcome to Trekatour Hyderabad.")

    async def _test():
        tts = MockTTS()
        agent = MockAgent()
        vs = VoiceSession(agent=agent, tts=tts)

        chunks = []
        async for item in vs.process_transcript_to_audio("Hello"):
            chunks.append(item)

        assert len(chunks) > 0
        assert any("Namaste traveler!" in c.get("content", "") for c in chunks)
        assert len(tts.sent_chunks) > 0

    asyncio.run(_test())
