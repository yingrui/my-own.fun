"""
Document library API - profile-scoped list of extracted documents stored in Neo4j.
"""

import logging

from fastapi import APIRouter, HTTPException

from app.models.schemas import DocumentLibraryAdd
from app.services.neo4j_service import neo4j_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/profiles/{profile_id}/documents", tags=["document-library"])


@router.get("")
async def list_documents(profile_id: str):
    """List all documents in the profile's library."""
    try:
        neo4j_service.get_or_create_profile(profile_id)
        rows = neo4j_service.get_document_library(profile_id)
        documents = []
        for r in rows:
            extracted_at = r.get("extractedAt") or 0
            if hasattr(extracted_at, "timestamp"):
                extracted_at = int(extracted_at.timestamp() * 1000)
            fh = r["fileHash"]
            fn = r.get("filename", "")
            documents.append({
                "id": f"{fh}|{fn}" if fn else fh,
                "filename": fn,
                "fileHash": fh,
                "extractedAt": extracted_at,
                "blockCount": r.get("blockCount", 0),
            })
        return {"documents": documents}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("", status_code=201)
async def add_document(profile_id: str, body: DocumentLibraryAdd):
    """Add a document to the profile's library."""
    try:
        logger.info("Adding document to library: profile=%s, file_hash=%s", profile_id, body.file_hash)
        neo4j_service.add_document_to_library(
            profile_id=profile_id,
            file_hash=body.file_hash,
            filename=body.filename,
            extracted_at=body.extracted_at,
            block_count=body.block_count,
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.delete("/{file_hash}")
async def remove_document(profile_id: str, file_hash: str, filename: str | None = None):
    """Remove a document from the profile's library. Pass filename to disambiguate when multiple docs share the same hash."""
    try:
        removed = neo4j_service.remove_document_from_library(
            profile_id, file_hash, filename=filename
        )
        if not removed:
            raise HTTPException(status_code=404, detail="Document not found in library")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
