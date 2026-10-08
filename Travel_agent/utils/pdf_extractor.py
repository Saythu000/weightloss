"""
Trekatour Travel PDF Itinerary Extractor
Extracts raw text and table structures from travel PDF documents.
Handles fallback to Tesseract OCR for image-only or scanned itinerary files.
"""

from typing import Dict, Any, List, Optional
from pathlib import Path
import logging

logger = logging.getLogger("Trekatour.Utils.PDFExtractor")

try:
    import pypdf
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False

try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False


class PDFExtractor:
    """
    Extracts text content and page-by-page metadata from PDF itinerary documents.
    """

    @classmethod
    def extract_text(cls, pdf_path: Path) -> Dict[str, Any]:
        """
        Extracts full text and per-page content from a PDF file.
        """
        pdf_path = Path(pdf_path)
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")

        extracted_text = ""
        pages_content: List[Dict[str, Any]] = []

        # Attempt extraction using pdfplumber (better layout/table parsing)
        if HAS_PDFPLUMBER:
            try:
                with pdfplumber.open(pdf_path) as pdf:
                    for idx, page in enumerate(pdf.pages):
                        page_text = page.extract_text() or ""
                        tables = page.extract_tables() or []
                        pages_content.append(
                            {
                                "page_number": idx + 1,
                                "text": page_text,
                                "tables_count": len(tables),
                            }
                        )
                        extracted_text += f"\n--- Page {idx+1} ---\n" + page_text
                logger.info(f"Extracted {len(extracted_text)} chars from {pdf_path} using pdfplumber")
            except Exception as e:
                logger.warning(f"pdfplumber extraction failed ({e}), falling back to pypdf")

        # Fallback to pypdf if pdfplumber didn't yield text
        if not extracted_text.strip() and HAS_PYPDF:
            try:
                reader = pypdf.PdfReader(str(pdf_path))
                for idx, page in enumerate(reader.pages):
                    page_text = page.extract_text() or ""
                    pages_content.append(
                        {
                            "page_number": idx + 1,
                            "text": page_text,
                        }
                    )
                    extracted_text += f"\n--- Page {idx+1} ---\n" + page_text
                logger.info(f"Extracted {len(extracted_text)} chars from {pdf_path} using pypdf")
            except Exception as e:
                logger.error(f"pypdf extraction failed: {e}")

        # Check if PDF is a scanned image (text too short) and attempt OCR fallback
        if len(extracted_text.strip()) < 100:
            logger.info("PDF appears to be scanned image-based. Attempting OCR fallback...")
            try:
                from utils.pdf_ocr import PDFOCRExtractor
                ocr_text = PDFOCRExtractor.extract_text_ocr(pdf_path)
                if ocr_text.strip():
                    extracted_text = ocr_text
            except Exception as e:
                logger.error(f"OCR extraction failed or not configured: {e}")

        return {
            "file_name": pdf_path.name,
            "total_pages": len(pages_content),
            "full_text": extracted_text.strip(),
            "pages": pages_content,
            "char_count": len(extracted_text.strip()),
        }
