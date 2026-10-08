"""
Multi-Format Travel Document & Itinerary Chunker
Splits long travel documents, PDF text, and markdown files into semantic chunks with metadata preservation.
"""

from typing import List, Dict, Any, Optional
import re


class DocumentChunk:
    """Represents a processed document chunk with text and metadata."""

    def __init__(self, content: str, chunk_id: str, metadata: Dict[str, Any]):
        self.content = content
        self.chunk_id = chunk_id
        self.metadata = metadata

    @property
    def text(self) -> str:
        return self.content

    def to_dict(self) -> Dict[str, Any]:

        return {
            "chunk_id": self.chunk_id,
            "content": self.content,
            "metadata": self.metadata,
        }


class ItineraryChunker:
    """
    Splits travel itineraries into chunk sizes suitable for dense embeddings and hybrid search.
    Preserves headings (e.g. Day 1, Inclusions, Cost Breakdown).
    """

    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 100):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_text(self, text: str, source_doc: str = "itinerary.pdf", trip_name: str = "Trekatour Trip") -> List[DocumentChunk]:
        """Splits raw itinerary text into DocumentChunk instances with metadata."""
        cleaned_text = self._clean_text(text)
        if not cleaned_text:
            return []

        # Try section-aware splitting first (splitting by "Day 1", "Day 2", "Inclusions", etc.)
        sections = re.split(r"(?i)(?=\b(?:Day\s*\d+|Inclusions?|Exclusions?|Cost|Itinerary|Overview|Notes?)\b)", cleaned_text)
        
        chunks: List[DocumentChunk] = []
        chunk_idx = 0

        for sec in sections:
            sec = sec.strip()
            if not sec:
                continue

            if len(sec) <= self.chunk_size:
                chunk_id = f"{source_doc}_chunk_{chunk_idx:03d}"
                chunks.append(
                    DocumentChunk(
                        content=sec,
                        chunk_id=chunk_id,
                        metadata={
                            "source": source_doc,
                            "trip_name": trip_name,
                            "chunk_index": chunk_idx,
                            "char_len": len(sec),
                        },
                    )
                )
                chunk_idx += 1
            else:
                # Sliding window split for long sections
                start = 0
                while start < len(sec):
                    end = min(start + self.chunk_size, len(sec))
                    sub_text = sec[start:end].strip()
                    if sub_text:
                        chunk_id = f"{source_doc}_chunk_{chunk_idx:03d}"
                        chunks.append(
                            DocumentChunk(
                                content=sub_text,
                                chunk_id=chunk_id,
                                metadata={
                                    "source": source_doc,
                                    "trip_name": trip_name,
                                    "chunk_index": chunk_idx,
                                    "char_len": len(sub_text),
                                },
                            )
                        )
                        chunk_idx += 1
                    start += self.chunk_size - self.chunk_overlap

        return chunks

    def create_chunks(self, file_path_or_text: str, tenant_id: str = "default", document_id: str = "doc_1") -> List[DocumentChunk]:
        """Convenience method for creating chunks from a file path or text string."""
        import os
        if os.path.exists(file_path_or_text):
            with open(file_path_or_text, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            source = os.path.basename(file_path_or_text)
        else:
            content = file_path_or_text
            source = document_id

        chunks = self.chunk_text(content, source_doc=source, trip_name=tenant_id)
        for c in chunks:
            c.metadata["tenant_id"] = tenant_id
            c.metadata["document_id"] = document_id
        return chunks

    def _clean_text(self, text: str) -> str:
        """Normalizes whitespace and removes unwanted artifacts."""
        text = re.sub(r"\r\n|\r", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()



MultiFormatChunker = ItineraryChunker

