"""
Embedding Connector Interface for Knowledgebase & Vectorstore Operations
Supports local SentenceTransformers (BAAI/bge-small-en-v1.5) and HuggingFace API.
"""

from typing import List, Union
import logging

logger = logging.getLogger("Trekatour.Knowledgebase.Embedding")

try:
    from sentence_transformers import SentenceTransformer
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False


class EmbeddingConnector:
    """
    Embedding Provider Connector supporting local models and zero-vector fallbacks.
    """

    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5", dimension: int = 384):
        self.model_name = model_name
        self.dimension = dimension
        self.model = None

        if HAS_SENTENCE_TRANSFORMERS:
            try:
                logger.info(f"Loading embedding model: {model_name}")
                self.model = SentenceTransformer(model_name)
            except Exception as e:
                logger.warning(f"Failed to load SentenceTransformer ({e}). Falling back to dummy vectors.")

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generates list of float embeddings for given text snippets."""
        if not texts:
            return []

        if self.model is not None:
            try:
                embeddings = self.model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
                return embeddings.tolist()
            except Exception as e:
                logger.error(f"Error during embedding encoding: {e}")

        # Fallback dummy embedding (zero vector of requested dimension)
        return [[0.0] * self.dimension for _ in texts]

    def embed_query(self, query: str) -> List[float]:
        """Embeds a single query string."""
        res = self.embed_texts([query])
        return res[0] if res else [0.0] * self.dimension
