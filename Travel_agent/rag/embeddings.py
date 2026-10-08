from __future__ import annotations
import math
import logging
from typing import List

logger = logging.getLogger(__name__)

class FreeLocalEmbeddings:
    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5"):
        self.model_name = model_name
        self._st_model = None
        self._load_model()

    def _load_model(self) -> None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading local embedding model: {self.model_name}")
            self._st_model = SentenceTransformer(self.model_name)
        except Exception as e:
            logger.warning(f"Could not load SentenceTransformer ({e}). Using deterministic fallback embedding generator.")
            self._st_model = None

    def embed_text(self, text: str) -> List[float]:
        if self._st_model is not None:
            embedding = self._st_model.encode(text, convert_to_numpy=True)
            return embedding.tolist()
        
        # Fallback deterministic pseudo-embedding vector (384 dimensions) for offline/lightweight testing
        return self._hash_embedding(text, dimension=384)

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        if self._st_model is not None:
            embeddings = self._st_model.encode(texts, convert_to_numpy=True)
            return [emb.tolist() for emb in embeddings]
        
        return [self._hash_embedding(t, dimension=384) for t in texts]

    def _hash_embedding(self, text: str, dimension: int = 384) -> List[float]:
        import hashlib
        words = text.lower().split()
        vector = [0.0] * dimension
        for i, word in enumerate(words):
            h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
            idx = h % dimension
            val = (h % 100) / 100.0
            vector[idx] += val

        norm = math.sqrt(sum(x * x for x in vector)) or 1.0
        return [x / norm for x in vector]
