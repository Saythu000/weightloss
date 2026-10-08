from __future__ import annotations
import json
from typing import Any, List
from pydantic import BaseModel, Field
from tools.base import Tool, ToolKind, ToolResult
from rag.embeddings import FreeLocalEmbeddings
from rag.vectorstore import ChromaVectorStore
from rag.hybrid_search import HybridSearchEngine
from rag.query_rewriter import QueryRewriterNode
from config.config import config

class QueryInput(BaseModel):
    query: str = Field(description="The question or search query to search within company documents.")
    tenant_id: str = Field(default="default_tenant", description="Tenant ID for vector isolation.")

class DocumentRAGTool(Tool):
    name: str = "document_rag_search"
    description: str = "Searches official company documents using Hybrid Search (Dense Vectors + BM25 Keywords)."
    kind: ToolKind = ToolKind.RAG
    args_schema = QueryInput

    def __init__(self, vector_store: ChromaVectorStore | None = None):
        super().__init__()
        if vector_store is None:
            embeddings = FreeLocalEmbeddings(model_name=config.embedding_model_name)
            vector_store = ChromaVectorStore(chromadb_dir=config.chromadb_dir, embedding_model=embeddings)
        
        self.vector_store = vector_store
        self.hybrid_engine = HybridSearchEngine(vector_store=self.vector_store)
        self.query_rewriter = QueryRewriterNode(api_key=config.openai_api_key, model=config.llm_model)

    def run(self, query: str, tenant_id: str = "default_tenant", **kwargs: Any) -> ToolResult:
        try:
            # 1. Rewrite Query for optimization
            optimized_query = self.query_rewriter.rewrite_query(query)

            # 2. Execute Hybrid Search
            results = self.hybrid_engine.search(
                query=optimized_query,
                tenant_id=tenant_id,
                top_k=config.top_k_results
            )

            if not results:
                return ToolResult(
                    success=True,
                    output=f"No relevant document sections found matching query: '{query}'",
                    metadata={"query": query, "results_count": 0}
                )

            formatted_sections = []
            for i, item in enumerate(results, 1):
                file_name = item.get("metadata", {}).get("file_name", "Unknown File")
                score = item.get("score", 0.0)
                formatted_sections.append(f"[Source {i}: {file_name} (Relevance Score: {score})]\n{item['text']}")

            combined_output = "\n\n---\n\n".join(formatted_sections)

            return ToolResult(
                success=True,
                output=combined_output,
                metadata={
                    "original_query": query,
                    "rewritten_query": optimized_query,
                    "results_count": len(results),
                    "raw_results": results
                }
            )

        except Exception as e:
            return ToolResult(
                success=False,
                output="",
                error=f"Error executing document RAG search: {str(e)}"
            )
