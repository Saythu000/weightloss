from __future__ import annotations
import logging
from typing import Any, List, Dict
from pydantic import BaseModel, Field
from tools.base import Tool, ToolKind, ToolResult
from rag.vectorstore import ChromaVectorStore

logger = logging.getLogger("HybridSearchTool")

class HybridSearchArgs(BaseModel):
    query: str = Field(description="Search query for travel itinerary, inclusions, or trip policy")
    top_k: int = Field(default=5, description="Number of top relevant chunks to retrieve")

class HybridSearchTool(Tool):
    name = "hybrid_itinerary_search"
    description = "Searches official Trekatour PDF trip itineraries using hybrid BM25 + dense vector HNSW retrieval."
    kind = ToolKind.RAG
    args_schema = HybridSearchArgs

    def __init__(self, vectorstore: Any = None):
        self.vectorstore = vectorstore or ChromaVectorStore()

    def run(self, query: str, top_k: int = 5, **kwargs: Any) -> ToolResult:
        try:
            results = self.vectorstore.search(query, top_k=top_k)
            if not results:
                return ToolResult(
                    success=True,
                    output=f"No matching itinerary chunks found for query: '{query}'."
                )

            formatted_chunks = []
            for idx, res in enumerate(results, 1):
                doc_name = res.get("metadata", {}).get("source", "Itinerary.pdf")
                content = res.get("content", "")
                score = res.get("score", 0.0)
                formatted_chunks.append(f"--- Chunk {idx} (Source: {doc_name}, Score: {score:.2f}) ---\n{content}")

            return ToolResult(
                success=True,
                output="\n\n".join(formatted_chunks),
                metadata={"query": query, "count": len(results)}
            )
        except Exception as e:
            logger.error(f"Error in HybridSearchTool execution: {e}")
            return ToolResult(success=False, output="", error=str(e))
