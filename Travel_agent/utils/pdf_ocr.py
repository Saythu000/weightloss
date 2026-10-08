"""
Trekatour Tesseract OCR Fallback Extractor for Scanned Travel PDFs
Converts scanned PDF pages to images and runs Optical Character Recognition.
"""

from typing import Dict, Any, List
from pathlib import Path
import logging

logger = logging.getLogger("Trekatour.Utils.PDFOCR")

try:
    import pytesseract
    HAS_PYTESSERACT = True
except ImportError:
    HAS_PYTESSERACT = False

try:
    from pdf2image import convert_from_path
    HAS_PDF2IMAGE = True
except ImportError:
    HAS_PDF2IMAGE = False


class PDFOCRExtractor:
    """
    Optical Character Recognition pipeline for image-based PDFs.
    """

    @classmethod
    def extract_text_ocr(cls, pdf_path: Path, dpi: int = 200) -> str:
        """
        Converts PDF pages into PIL Images and applies Tesseract OCR.
        """
        if not HAS_PYTESSERACT:
            logger.warning("pytesseract is not installed. Skipping OCR.")
            return ""

        if not HAS_PDF2IMAGE:
            logger.warning("pdf2image is not installed. Skipping OCR.")
            return ""

        pdf_path = Path(pdf_path)
        if not pdf_path.exists():
            return ""

        ocr_full_text = ""
        try:
            images = convert_from_path(str(pdf_path), dpi=dpi)
            logger.info(f"Converted {len(images)} pages to images for OCR scanning.")

            for idx, img in enumerate(images):
                page_text = pytesseract.image_to_string(img, lang="eng")
                ocr_full_text += f"\n--- Page {idx+1} (OCR) ---\n" + page_text

            logger.info(f"Successfully extracted {len(ocr_full_text)} chars via OCR")
        except Exception as e:
            logger.error(f"Failed to execute OCR on PDF ({pdf_path}): {e}")

        return ocr_full_text.strip()
