from __future__ import annotations
import math
from typing import Any, List
from rag.vectorstore import ChromaVectorStore

class HybridSearchEngine:
    def __init__(self, vector_store: ChromaVectorStore):
        self.vector_store = vector_store

    def _bm25_score(self, query_tokens: List[str], doc_tokens: List[str]) -> float:
        score = 0.0
        doc_len = len(doc_tokens) or 1
        for token in query_tokens:
            count = doc_tokens.count(token)
            if count > 0:
                score += (count / doc_len) * (1.0 + math.log(1.0 + count))
        return score

    def search(
        self,
        query: str,
        tenant_id: str = "default_tenant",
        top_k: int = 5,
        vector_weight: float = 0.7
    ) -> List[dict[str, Any]]:
        # 1. Get Dense Vector Search Candidates
        vector_candidates = self.vector_store.search(query=query, tenant_id=tenant_id, top_k=top_k * 2)
        if not vector_candidates:
            return []

        # 2. Compute BM25 / Keyword Score
        query_tokens = query.lower().split()
        hybrid_results = []

        max_bm25 = 0.0001
        raw_scores = []
        for candidate in vector_candidates:
            doc_tokens = candidate["text"].lower().split()
            bm25 = self._bm25_score(query_tokens, doc_tokens)
            raw_scores.append(bm25)
            if bm25 > max_bm25:
                max_bm25 = bm25

        for candidate, bm25 in zip(vector_candidates, raw_scores):
            norm_vector_score = candidate["score"]
            norm_bm25_score = bm25 / max_bm25 if max_bm25 > 0 else 0.0

            # Combined Hybrid Score
            combined_score = (vector_weight * norm_vector_score) + ((1.0 - vector_weight) * norm_bm25_score)
            
            result_item = dict(candidate)
            result_item["score"] = round(combined_score, 4)
            result_item["vector_score"] = round(norm_vector_score, 4)
            result_item["bm25_score"] = round(norm_bm25_score, 4)
            hybrid_results.append(result_item)

        hybrid_results.sort(key=lambda x: x["score"], reverse=True)
        return hybrid_results[:top_k]

    def delete_document(self, document_id: str, tenant_id: str = "default_tenant") -> int:
        """
        Delegates document deletion to the vector store.
        """
        return self.vector_store.delete_document(document_id=document_id, tenant_id=tenant_id)

