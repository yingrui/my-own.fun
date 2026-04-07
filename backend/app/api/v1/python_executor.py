"""
Python execution API — run inline code (temp file) or an existing workspace script.

Inline ``code`` is written to a temporary ``.py`` under the workspace, executed, then
removed. Persisted scripts should be created with the filesystem API, then run via
``script_path``.
"""

import asyncio
import logging
import os
import tempfile
import time
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, model_validator

from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tools/python", tags=["agent-tools"])

MAX_TIMEOUT_SECONDS = 120
DEFAULT_TIMEOUT_SECONDS = 30
MAX_OUTPUT_BYTES = 512 * 1024


def _workspace_root() -> Path:
    root = getattr(settings, "agent_workspace_root", None) or os.path.expanduser(
        os.environ.get("AGENT_WORKSPACE_ROOT", "~/agent-workspace")
    )
    p = Path(root).resolve()
    p.mkdir(parents=True, exist_ok=True)
    return p


class ExecutePythonRequest(BaseModel):
    """Exactly one of ``code`` (inline snippet) or ``script_path`` (workspace-relative file)."""

    code: Optional[str] = None
    script_path: Optional[str] = None
    timeout: Optional[int] = None

    @model_validator(mode="after")
    def exactly_one_source(self) -> "ExecutePythonRequest":
        has_code = self.code is not None and self.code.strip() != ""
        has_path = self.script_path is not None and self.script_path.strip() != ""
        if has_code == has_path:
            raise ValueError("Provide exactly one of code or script_path")
        return self


class ExecutePythonResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    elapsed_ms: int
    timed_out: bool = False
    script_path: Optional[str] = None


@router.post("/execute", response_model=ExecutePythonResponse)
async def execute_python(req: ExecutePythonRequest):
    """
    Execute Python inside the workspace.

    * ``code`` — inline source (written to a temp ``.py`` under the workspace, then removed).
    * ``script_path`` — run an existing file (use ``write_file`` first to persist scripts).
    * ``timeout`` — max seconds (default 30, max 120).
    """
    workspace = _workspace_root()
    timeout = min(req.timeout or DEFAULT_TIMEOUT_SECONDS, MAX_TIMEOUT_SECONDS)

    saved_rel: Optional[str] = None
    tmp_path: Optional[str] = None

    if req.script_path is not None and req.script_path.strip():
        target = (workspace / req.script_path.strip()).resolve()
        if not str(target).startswith(str(workspace)):
            raise HTTPException(status_code=403, detail="script_path escapes workspace")
        if not target.is_file():
            raise HTTPException(
                status_code=404, detail=f"Script not found: {req.script_path.strip()}"
            )
        script_path = str(target)
        saved_rel = str(target.relative_to(workspace))
    else:
        tmp = tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".py",
            dir=str(workspace),
            delete=False,
            encoding="utf-8",
        )
        tmp.write(req.code or "")
        tmp.close()
        script_path = tmp.name
        tmp_path = script_path

    timed_out = False
    start = time.monotonic()
    proc: Optional[asyncio.subprocess.Process] = None

    try:
        proc = await asyncio.create_subprocess_exec(
            "python3",
            script_path,
            cwd=str(workspace),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env={**os.environ, "PYTHONUNBUFFERED": "1"},
        )
        try:
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                proc.communicate(), timeout=timeout
            )
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            timed_out = True
            stdout_bytes = b""
            stderr_bytes = f"Script timed out after {timeout}s".encode()
    except Exception as exc:
        elapsed = int((time.monotonic() - start) * 1000)
        logger.exception("Python execution failed")
        return ExecutePythonResponse(
            stdout="",
            stderr=f"Execution error: {exc}",
            exit_code=-1,
            elapsed_ms=elapsed,
        )
    finally:
        if tmp_path:
            try:
                Path(tmp_path).unlink(missing_ok=True)
            except Exception:
                pass

    elapsed = int((time.monotonic() - start) * 1000)

    def _decode(raw: bytes) -> str:
        text = raw.decode("utf-8", errors="replace")
        if len(text) > MAX_OUTPUT_BYTES:
            return text[:MAX_OUTPUT_BYTES] + "\n... [truncated]"
        return text

    return ExecutePythonResponse(
        stdout=_decode(stdout_bytes),
        stderr=_decode(stderr_bytes),
        exit_code=proc.returncode if proc.returncode is not None else -1,
        elapsed_ms=elapsed,
        timed_out=timed_out,
        script_path=saved_rel,
    )
