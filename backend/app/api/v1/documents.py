"""
Document extraction API using PaddleOCR.
"""

import asyncio
import logging
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.services.document_extraction_service import (
    close_extraction_service,
    extract_document,
    get_cached_document,
)

# Cache directory for document extraction (images, parsed results)
_CACHE_DIR = Path(__file__).resolve().parent.parent.parent.parent / ".cache"

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])

# Supported file extensions for document extraction
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".gif", ".webp", ".pdf"}


def _is_allowed_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


@router.post("/extract")
async def extract_document_content(file: UploadFile = File(...)):
    """
    Extract structured content from an uploaded document (image or PDF)
    using PaddleOCR doc_parser.

    Returns layout detection, parsed text blocks, and markdown representation.
    """
    if not _is_allowed_file(file.filename or ""):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    try:
        contents = await file.read()
    except Exception as e:
        logger.exception("Failed to read uploaded file")
        raise HTTPException(status_code=400, detail=f"Failed to read file: {e}") from e

    if not contents:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    suffix = Path(file.filename or "image.png").suffix.lower()
    if suffix == ".pdf":
        suffix = ".pdf"

    try:
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=suffix
        ) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name
    except Exception as e:
        logger.exception("Failed to save temp file")
        raise HTTPException(
            status_code=500, detail=f"Failed to process file: {e}"
        ) from e

    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, extract_document, tmp_path
        )
        return {"success": True, "data": result, "filename": file.filename}
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.exception("Document extraction failed")
        raise HTTPException(
            status_code=500,
            detail=f"Extraction failed: {str(e)}",
        ) from e
    finally:
        try:
            Path(tmp_path).unlink(missing_ok=True)
        except Exception:
            pass


# Define /imgs/... before /{file_hash} so it matches first
@router.get("/imgs/{file_hash}/{filename:path}")
async def get_cached_image(file_hash: str, filename: str):
    """
    Serve cached images from document extraction.
    E.g. /api/v1/documents/imgs/{sha256}/block_0.png
    """
    if ".." in file_hash or ".." in filename:
        raise HTTPException(status_code=403, detail="Invalid path")
    if len(file_hash) != 64 or not all(c in "0123456789abcdef" for c in file_hash.lower()):
        raise HTTPException(status_code=400, detail="Invalid file_hash")
    path = (_CACHE_DIR / file_hash / filename).resolve()
    cache_resolved = _CACHE_DIR.resolve()
    if not str(path).startswith(str(cache_resolved)):
        raise HTTPException(status_code=403, detail="Invalid path")
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    media_type = "image/png" if filename.lower().endswith(".png") else "image/jpeg"
    return FileResponse(path, media_type=media_type)


@router.get("/{file_hash}")
async def get_cached_document_content(file_hash: str):
    """
    Return cached extraction result by file hash.
    Use when opening a document from the library without re-uploading.
    """
    if len(file_hash) != 64 or not all(c in "0123456789abcdef" for c in file_hash.lower()):
        raise HTTPException(status_code=400, detail="Invalid file_hash")
    result = get_cached_document(file_hash)
    if result is None:
        raise HTTPException(status_code=404, detail="Cache not found or expired")
    return {"success": True, "data": result}
