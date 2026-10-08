from __future__ import annotations
import logging
from typing import List

logger = logging.getLogger("EmbeddingHelper")

try:
    from sentence_transformers import SentenceTransformer
    _ST_MODEL = SentenceTransformer("BAAI/bge-small-en-v1.5")
except Exception as e:
    _ST_MODEL = None
    logger.warning(f"SentenceTransformer embedding model fallback: {e}")

def get_embedding(text: str) -> List[float]:
    """Generates dense vector embeddings for input text."""
    if _ST_MODEL:
        return _ST_MODEL.encode(text).tolist()
    # Dummy fallback if model not loaded
    return [0.0] * 384
