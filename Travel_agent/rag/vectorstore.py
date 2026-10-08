"""
ChromaDB Vector Store Wrapper for Trekatour Itinerary RAG
Manages document indexing, dense vector search, and BM25 hybrid keyword matching.
"""

from typing import List, Dict, Any, Optional
from pathlib import Path
import logging
import re

logger = logging.getLogger("Trekatour.RAG.VectorStore")

try:
    import chromadb
    from chromadb.config import Settings
    HAS_CHROMADB = True
except ImportError:
    HAS_CHROMADB = False

from knowledgebase.embedding import EmbeddingConnector


class ChromaVectorStore:
    """
    Vector store manager using ChromaDB and local sentence transformer embeddings.
    """

    def __init__(
        self,
        collection_name: str = "trekatour_itineraries",
        persist_directory: Optional[Path] = None,
        embedding_model: Any = "BAAI/bge-small-en-v1.5",
        chromadb_dir: Optional[Path] = None,
    ):
        self.collection_name = collection_name
        p_dir = persist_directory or chromadb_dir
        if isinstance(p_dir, str):
            p_dir = Path(p_dir)

        if hasattr(embedding_model, "embed_text") or hasattr(embedding_model, "embed_texts"):
            self.embedder = embedding_model
        else:
            self.embedder = EmbeddingConnector(model_name=str(embedding_model))
        
        self.client = None
        self.collection = None

        if HAS_CHROMADB:
            try:
                if p_dir:
                    p_dir.mkdir(parents=True, exist_ok=True)
                    self.client = chromadb.PersistentClient(path=str(p_dir))
                else:
                    self.client = chromadb.Client()


                self.collection = self.client.get_or_create_collection(
                    name=collection_name,
                    metadata={"hnsw:space": "cosine"},
                )
                logger.info(f"Initialized ChromaDB collection: '{collection_name}'")
            except Exception as e:
                logger.error(f"Failed to initialize ChromaDB collection ({e}). Using mock store.")

        # In-memory fallback dictionary if ChromaDB is unavailable
        self._memory_docs: List[Dict[str, Any]] = []

    def add_chunks(self, chunks: List[Any]) -> int:
        """Helper to add DocumentChunk instances."""
        docs = []
        for c in chunks:
            if hasattr(c, "to_dict"):
                docs.append(c.to_dict())
            elif isinstance(c, dict):
                docs.append(c)
            else:
                docs.append({
                    "chunk_id": getattr(c, "chunk_id", str(id(c))),
                    "content": getattr(c, "content", getattr(c, "text", str(c))),
                    "metadata": getattr(c, "metadata", {})
                })
        return self.add_documents(docs)

    def query_hybrid(self, query: str, tenant_id: str = "", top_k: int = 4) -> List[Dict[str, Any]]:
        """Helper for hybrid search with optional tenant filtering."""
        filter_meta = {"tenant_id": tenant_id} if tenant_id else None
        return self.search(query, top_k=top_k, filter_metadata=filter_meta)

    def delete_document(self, document_id: str, tenant_id: Optional[str] = None) -> int:
        """Deletes all chunks associated with a document_id from vector store."""
        deleted_count = 0
        if self.collection is not None:
            try:
                where_clause: Dict[str, Any] = {"document_id": document_id}
                if tenant_id:
                    where_clause = {"$and": [{"document_id": document_id}, {"tenant_id": tenant_id}]}
                
                matching = self.collection.get(where=where_clause)
                if matching and "ids" in matching and matching["ids"]:
                    deleted_count = len(matching["ids"])
                    self.collection.delete(ids=matching["ids"])
            except Exception as e:
                logger.error(f"Error purging document '{document_id}' from ChromaDB: {e}")

        initial_mem_len = len(self._memory_docs)
        self._memory_docs = [
            doc for doc in self._memory_docs
            if doc.get("metadata", {}).get("document_id") != document_id
        ]
        deleted_mem = initial_mem_len - len(self._memory_docs)
        return deleted_count or deleted_mem

    def add_documents(self, documents: List[Dict[str, Any]]) -> int:

        """
        Adds document chunks to vectorstore.
        Each doc dict expects: {"content": str, "chunk_id": str, "metadata": dict}
        """
        if not documents:
            return 0

        ids = [d["chunk_id"] for d in documents]
        contents = [d["content"] for d in documents]
        metadatas = [d.get("metadata", {}) for d in documents]
        if hasattr(self.embedder, "embed_texts"):
            embeddings = self.embedder.embed_texts(contents)
        elif hasattr(self.embedder, "embed_text"):
            embeddings = [self.embedder.embed_text(t) for t in contents]
        else:
            embeddings = [[0.1] * 384 for _ in contents]

        if self.collection is not None:

            try:
                self.collection.add(
                    ids=ids,
                    documents=contents,
                    embeddings=embeddings,
                    metadatas=metadatas,
                )
                logger.info(f"Added {len(documents)} chunks to Chroma collection '{self.collection_name}'")
                return len(documents)
            except Exception as e:
                logger.error(f"Error adding documents to ChromaDB: {e}")

        # Fallback in-memory add
        for d, emb in zip(documents, embeddings):
            self._memory_docs.append(
                {
                    "id": d["chunk_id"],
                    "content": d["content"],
                    "metadata": d.get("metadata", {}),
                    "embedding": emb,
                }
            )
        return len(documents)

    def search(
        self,
        query: str,
        top_k: int = 4,
        filter_metadata: Optional[Dict[str, Any]] = None,
        tenant_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Performs hybrid vector & keyword similarity search.
        """
        if tenant_id:
            filter_metadata = filter_metadata or {}
            filter_metadata["tenant_id"] = tenant_id

        if hasattr(self.embedder, "embed_query"):

            query_embedding = self.embedder.embed_query(query)
        elif hasattr(self.embedder, "embed_text"):
            query_embedding = self.embedder.embed_text(query)
        else:
            query_embedding = [0.1] * 384


        if self.collection is not None:
            try:
                where_clause = filter_metadata if filter_metadata else None
                results = self.collection.query(
                    query_embeddings=[query_embedding],
                    n_results=top_k,
                    where=where_clause,
                )

                formatted = []
                if results and "documents" in results and results["documents"]:
                    docs = results["documents"][0]
                    metas = results["metadatas"][0] if "metadatas" in results else [{}] * len(docs)
                    ids = results["ids"][0] if "ids" in results else [""] * len(docs)
                    distances = results["distances"][0] if "distances" in results and results["distances"] else [0.0] * len(docs)

                    for doc, meta, cid, dist in zip(docs, metas, ids, distances):
                        # Convert distance to similarity score
                        similarity = max(0.0, 1.0 - float(dist))
                        formatted.append(
                            {
                                "chunk_id": cid,
                                "content": doc,
                                "text": doc,
                                "metadata": meta,
                                "score": round(similarity, 4),
                            }
                        )
                return formatted
            except Exception as e:
                logger.error(f"Error performing ChromaDB search: {e}")

        # Fallback keyword match over memory store
        query_words = set(re.findall(r"\w+", query.lower()))
        matched = []
        for item in self._memory_docs:
            doc_words = set(re.findall(r"\w+", item["content"].lower()))
            overlap = len(query_words.intersection(doc_words))
            score = round(overlap / max(1, len(query_words)), 4)
            matched.append(
                {
                    "chunk_id": item["id"],
                    "content": item["content"],
                    "text": item["content"],
                    "metadata": item["metadata"],
                    "score": score,
                }
            )


        matched.sort(key=lambda x: x["score"], reverse=True)
        return matched[:top_k]
