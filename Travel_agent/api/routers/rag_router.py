"""
FastAPI RAG Search & PDF Itinerary Document Processing Router
"""

from fastapi import APIRouter, UploadFile, File, Query, Body, HTTPException
from typing import Dict, Any, List, Optional
from pathlib import Path
import tempfile
import logging

from rag.chunker import ItineraryChunker
from rag.vectorstore import ChromaVectorStore
from utils.pdf_extractor import PDFExtractor

logger = logging.getLogger("Trekatour.API.RAGRouter")
router = APIRouter(prefix="/rag", tags=["Itinerary RAG Engine"])

vector_store = ChromaVectorStore(collection_name="trekatour_itineraries")
chunker = ItineraryChunker(chunk_size=500, chunk_overlap=100)


@router.post("/query")
async def query_itineraries(
    query: str = Body(..., embed=True),
    top_k: int = Body(4, embed=True),
    trip_name: Optional[str] = Body(None, embed=True),
):
    """
    Queries ChromaDB vectorstore for itinerary answers.
    """
    filter_meta = {"trip_name": trip_name} if trip_name else None
    results = vector_store.search(query=query, top_k=top_k, filter_metadata=filter_meta)
    return {"status": "SUCCESS", "count": len(results), "results": results}


@router.post("/upload-pdf")
async def upload_itinerary_pdf(
    file: UploadFile = File(...),
    trip_name: str = Query("Trekatour Trip"),
):
    """
    Uploads a trip itinerary PDF, extracts text, chunks it, and indexes into ChromaDB.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        extracted = PDFExtractor.extract_text(tmp_path)
        chunks = chunker.chunk_text(
            text=extracted["full_text"],
            source_doc=file.filename,
            trip_name=trip_name,
        )

        doc_dicts = [c.to_dict() for c in chunks]
        indexed_count = vector_store.add_documents(doc_dicts)

        return {
            "status": "SUCCESS",
            "filename": file.filename,
            "char_count": extracted["char_count"],
            "chunks_created": len(chunks),
            "chunks_indexed": indexed_count,
        }
    finally:
        tmp_path.unlink(missing_ok=True)
