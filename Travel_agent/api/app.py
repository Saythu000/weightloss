from __future__ import annotations
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routers.rag_router import router as rag_router
from api.wsrouters.chat_ws import router as ws_router
from config.config import config

app = FastAPI(
    title=config.app_name,
    description="Single Dedicated Self-Correcting Document RAG AI Agent Microservice",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rag_router)
app.include_router(ws_router)

@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "app_name": config.app_name,
        "environment": config.environment,
        "embedding_model": config.embedding_model_name
    }
