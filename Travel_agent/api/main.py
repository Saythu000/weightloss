"""
Trekatour AI Sales & Operations Agent System - FastAPI Application Entrypoint
Mounts HTTP Webhooks, REST API Routers, and WebSockets.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from api.routers import voice_router, whatsapp_router, rag_router, lead_router, payment_router
from api.wsrouters import chat_ws, voice_ws

logger = logging.getLogger("Trekatour.API.Main")

app = FastAPI(
    title="Trekatour AI Multi-Channel Sales Agent Engine",
    description="Autonomous Voice Calling, WhatsApp Outreach, Itinerary RAG Search, and Razorpay Payment Integration",
    version="2.0.0",
)

# Enable CORS for web widgets
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register REST Routers
app.include_router(voice_router.router)
app.include_router(whatsapp_router.router)
app.include_router(rag_router.router)
app.include_router(lead_router.router)
app.include_router(payment_router.router)

# Register WebSocket Routers
app.include_router(chat_ws.router)
app.include_router(voice_ws.router)


@app.get("/", tags=["Health"])
async def root_health_check():
    return {
        "status": "ONLINE",
        "system": "Trekatour AI Multi-Channel Sales Agent Engine",
        "version": "2.0.0",
        "services": [
            "Voice Outreach (Twilio + Sarvam AI)",
            "WhatsApp Automation (Interactive Buttons & PDF Brochures)",
            "Itinerary RAG Engine (ChromaDB + BM25)",
            "Dynamic Group Discount Engine",
            "Razorpay Payment & PDF Voucher Generator",
        ],
    }
