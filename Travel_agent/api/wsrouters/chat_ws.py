"""
FastAPI WebSocket Router for Web Chat & Assistant Widget
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Any
import logging
from customagents.sessionmanager import SessionManager
from client.llm_client import AsyncLLMClient

logger = logging.getLogger("Trekatour.API.ChatWS")
router = APIRouter(prefix="/ws", tags=["WebSocket Interfaces"])

session_manager = SessionManager(llm_client=AsyncLLMClient())


@router.websocket("/chat/{session_id}")
async def websocket_chat_endpoint(websocket: WebSocket, session_id: str):
    """
    Bi-directional JSON WebSocket endpoint for live web assistant interaction.
    """
    await websocket.accept()
    logger.info(f"WebSocket Chat connected: session_id={session_id}")

    try:
        while True:
            data = await websocket.receive_json()
            user_text = data.get("message", "").strip()
            agent_type = data.get("agent_type", "voice_agent")

            if not user_text:
                continue

            # Stream or run agent task
            response_text = await session_manager.execute_task_with_agent(
                agent_type=agent_type, session_id=session_id, user_input=user_text
            )

            await websocket.send_json(
                {
                    "session_id": session_id,
                    "agent_type": agent_type,
                    "response": response_text,
                }
            )
    except WebSocketDisconnect:
        logger.info(f"WebSocket Chat disconnected: session_id={session_id}")
    except Exception as e:
        logger.error(f"Error in Chat WS ({session_id}): {e}")
