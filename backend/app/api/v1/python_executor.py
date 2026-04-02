"""
Python execution API — lets the super-agent generate and run Python scripts.

Scripts are written to a temp file inside the workspace and executed via
a subprocess so the FastAPI event-loop is never blocked.
"""

import asyncio
import logging
import os
import tempfile
import time
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

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
    code: str
    timeout: Optional[int] = None
    save_as: Optional[str] = None


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
    Execute a Python script inside the workspace.

    * ``code`` — the Python source code to run.
    * ``timeout`` — max seconds (default 30, max 120).
    * ``save_as`` — optional filename to persist the script inside the workspace.
    """
    if not req.code.strip():
        raise HTTPException(status_code=400, detail="Empty code")

    workspace = _workspace_root()
    timeout = min(req.timeout or DEFAULT_TIMEOUT_SECONDS, MAX_TIMEOUT_SECONDS)

    if req.save_as:
        target = (workspace / req.save_as).resolve()
        if not str(target).startswith(str(workspace)):
            raise HTTPException(status_code=403, detail="save_as path escapes workspace")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(req.code, encoding="utf-8")
        script_path = str(target)
        saved_rel = str(target.relative_to(workspace))
    else:
        tmp = tempfile.NamedTemporaryFile(
            mode="w", suffix=".py", dir=str(workspace),
            delete=False, encoding="utf-8",
        )
        tmp.write(req.code)
        tmp.close()
        script_path = tmp.name
        saved_rel = None

    timed_out = False
    start = time.monotonic()

    try:
        proc = await asyncio.create_subprocess_exec(
            "python3", script_path,
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
        if not req.save_as:
            try:
                Path(script_path).unlink(missing_ok=True)
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
