from __future__ import annotations
import os
from pathlib import Path
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

class Config(BaseModel):
    app_name: str = "Trekatour Multi-Channel AI Sales Agent System"
    environment: str = Field(default_factory=lambda: os.getenv("ENVIRONMENT", "development"))
    
    # LLM Settings
    openai_api_key: str = Field(default_factory=lambda: os.getenv("OPENAI_API_KEY", ""))
    llm_model: str = Field(default_factory=lambda: os.getenv("LLM_MODEL", "gpt-4o-mini"))
    temperature: float = Field(default_factory=lambda: float(os.getenv("LLM_TEMPERATURE", "0.1")))
    
    # Voice & Speech STT/TTS Providers
    sarvam_api_key: str = Field(default_factory=lambda: os.getenv("SARVAM_API_KEY", ""))
    sarvam_speaker: str = Field(default_factory=lambda: os.getenv("SARVAM_SPEAKER", "neha"))
    sarvam_stt_model: str = Field(default_factory=lambda: os.getenv("SARVAM_STT_MODEL", "saaras:v3"))
    sarvam_tts_model: str = Field(default_factory=lambda: os.getenv("SARVAM_TTS_MODEL", "bulbul:v3"))
    groq_api_key: str = Field(default_factory=lambda: os.getenv("GROQ_API_KEY", ""))
    stt_provider: str = Field(default_factory=lambda: os.getenv("STT_PROVIDER", "sarvam"))
    tts_provider: str = Field(default_factory=lambda: os.getenv("TTS_PROVIDER", "sarvam"))
    tts_voice: str = Field(default_factory=lambda: os.getenv("TTS_VOICE", "neha"))
    
    # Telephony & Messaging Integrations
    twilio_account_sid: str = Field(default_factory=lambda: os.getenv("TWILIO_ACCOUNT_SID", ""))
    twilio_auth_token: str = Field(default_factory=lambda: os.getenv("TWILIO_AUTH_TOKEN", ""))
    twilio_phone_number: str = Field(default_factory=lambda: os.getenv("TWILIO_PHONE_NUMBER", ""))
    
    whatsapp_api_token: str = Field(default_factory=lambda: os.getenv("WHATSAPP_API_TOKEN", ""))
    whatsapp_phone_number_id: str = Field(default_factory=lambda: os.getenv("WHATSAPP_PHONE_NUMBER_ID", ""))
    
    # Payments Integration
    razorpay_key_id: str = Field(default_factory=lambda: os.getenv("RAZORPAY_KEY_ID", ""))
    razorpay_key_secret: str = Field(default_factory=lambda: os.getenv("RAZORPAY_KEY_SECRET", ""))
    
    # RAG & Knowledgebase Settings
    embedding_model_name: str = Field(default_factory=lambda: os.getenv("EMBEDDING_MODEL_NAME", "BAAI/bge-small-en-v1.5"))
    chromadb_dir: Path = Field(default_factory=lambda: BASE_DIR / "data" / "chromadb")
    uploads_dir: Path = Field(default_factory=lambda: BASE_DIR / "data" / "uploads")
    vouchers_dir: Path = Field(default_factory=lambda: BASE_DIR / "data" / "vouchers")
    leads_file_path: Path = Field(default_factory=lambda: BASE_DIR / "data" / "leads.xlsx")
    chunk_size: int = 700
    chunk_overlap: int = 100
    top_k_results: int = 5
    
    # Database Settings
    database_url: str = Field(default_factory=lambda: os.getenv("DATABASE_URL", ""))
    sqlite_db_path: Path = Field(default_factory=lambda: BASE_DIR / "data" / "metadata.db")
    
    # Safety & Approval Policy
    approval_policy: str = Field(default_factory=lambda: os.getenv("APPROVAL_POLICY", "auto"))

    def ensure_directories(self) -> None:
        self.chromadb_dir.mkdir(parents=True, exist_ok=True)
        self.uploads_dir.mkdir(parents=True, exist_ok=True)
        self.vouchers_dir.mkdir(parents=True, exist_ok=True)
        self.leads_file_path.parent.mkdir(parents=True, exist_ok=True)

config = Config()
config.ensure_directories()

AgenticConfig = Config

