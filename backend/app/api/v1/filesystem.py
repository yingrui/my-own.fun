"""
Filesystem API — gives the super-agent read/write access to a sandboxed
workspace directory on the host machine.
"""

import logging
import mimetypes
import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tools/filesystem", tags=["agent-tools"])

# ---------------------------------------------------------------------------
# Sandbox helpers
# ---------------------------------------------------------------------------

def _workspace_root() -> Path:
    """Return the configured workspace root, default to ~/agent-workspace."""
    root = getattr(settings, "agent_workspace_root", None) or os.path.expanduser(
        os.environ.get("AGENT_WORKSPACE_ROOT", "~/agent-workspace")
    )
    p = Path(root).resolve()
    p.mkdir(parents=True, exist_ok=True)
    return p


def _safe_resolve(rel_path: str) -> Path:
    """Resolve *rel_path* inside the workspace root; reject escapes."""
    root = _workspace_root()
    target = (root / rel_path).resolve()
    if not str(target).startswith(str(root)):
        raise HTTPException(status_code=403, detail="Path escapes the workspace root")
    return target


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class WriteFileRequest(BaseModel):
    path: str
    content: str
    create_dirs: bool = True


class FileEntry(BaseModel):
    name: str
    is_dir: bool
    size: int


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/list")
async def list_directory(path: str = "."):
    """List entries in *path* (relative to workspace root)."""
    target = _safe_resolve(path)
    if not target.exists():
        raise HTTPException(status_code=404, detail="Directory not found")
    if not target.is_dir():
        raise HTTPException(status_code=400, detail="Path is not a directory")
    entries = []
    try:
        for entry in sorted(target.iterdir(), key=lambda e: (not e.is_dir(), e.name.lower())):
            entries.append(FileEntry(
                name=entry.name,
                is_dir=entry.is_dir(),
                size=entry.stat().st_size if entry.is_file() else 0,
            ))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return {"path": str(target.relative_to(_workspace_root())), "entries": entries}


@router.get("/read")
async def read_file(path: str):
    """Read file content (text). Returns ``{path, content, size}``."""
    target = _safe_resolve(path)
    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")
    if not target.is_file():
        raise HTTPException(status_code=400, detail="Path is not a regular file")
    max_size = 2 * 1024 * 1024  # 2 MB text limit
    if target.stat().st_size > max_size:
        raise HTTPException(status_code=413, detail="File too large (>2 MB)")
    try:
        content = target.read_text(encoding="utf-8", errors="replace")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Read error: {exc}") from exc
    return {"path": str(target.relative_to(_workspace_root())), "content": content, "size": len(content)}


@router.post("/write")
async def write_file(req: WriteFileRequest):
    """Write (or create) a text file. Parent dirs are created when *create_dirs* is true."""
    target = _safe_resolve(req.path)
    if req.create_dirs:
        target.parent.mkdir(parents=True, exist_ok=True)
    try:
        target.write_text(req.content, encoding="utf-8")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Write error: {exc}") from exc
    return {"path": str(target.relative_to(_workspace_root())), "size": len(req.content)}


@router.delete("/delete")
async def delete_file(path: str):
    """Delete a file (not directories)."""
    target = _safe_resolve(path)
    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")
    if target.is_dir():
        raise HTTPException(status_code=400, detail="Cannot delete directories via this endpoint")
    try:
        target.unlink()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Delete error: {exc}") from exc
    return {"deleted": str(target.relative_to(_workspace_root()))}


@router.get("/serve/{file_path:path}")
async def serve_file(file_path: str):
    """Serve a workspace file with its native content-type (for images, downloads, etc.)."""
    target = _safe_resolve(file_path)
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    media_type, _ = mimetypes.guess_type(target.name)
    return FileResponse(target, media_type=media_type or "application/octet-stream")
