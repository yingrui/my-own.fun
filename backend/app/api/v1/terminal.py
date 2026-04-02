"""
Terminal execution API — lets the super-agent run shell commands on the host.
Commands are executed inside the sandboxed workspace directory.
"""

import asyncio
import logging
import os
import time
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tools/terminal", tags=["agent-tools"])

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

MAX_TIMEOUT_SECONDS = 120
DEFAULT_TIMEOUT_SECONDS = 30
MAX_OUTPUT_BYTES = 512 * 1024  # 512 KB per stream


def _workspace_root() -> Path:
    root = getattr(settings, "agent_workspace_root", None) or os.path.expanduser(
        os.environ.get("AGENT_WORKSPACE_ROOT", "~/agent-workspace")
    )
    p = Path(root).resolve()
    p.mkdir(parents=True, exist_ok=True)
    return p


# ---------------------------------------------------------------------------
# Request / response
# ---------------------------------------------------------------------------

class ExecuteRequest(BaseModel):
    command: str
    cwd: Optional[str] = None
    timeout: Optional[int] = None


class ExecuteResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    elapsed_ms: int
    timed_out: bool = False


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/execute", response_model=ExecuteResponse)
async def execute_command(req: ExecuteRequest):
    """
    Run a shell command inside the workspace and return stdout / stderr.

    * ``cwd`` is relative to workspace root (default: root itself).
    * ``timeout`` in seconds (max 120, default 30).
    """
    if not req.command.strip():
        raise HTTPException(status_code=400, detail="Empty command")

    workspace = _workspace_root()
    if req.cwd:
        cwd = (workspace / req.cwd).resolve()
        if not str(cwd).startswith(str(workspace)):
            raise HTTPException(status_code=403, detail="cwd escapes workspace")
        if not cwd.is_dir():
            raise HTTPException(status_code=404, detail="cwd directory not found")
    else:
        cwd = workspace

    timeout = min(req.timeout or DEFAULT_TIMEOUT_SECONDS, MAX_TIMEOUT_SECONDS)
    timed_out = False
    start = time.monotonic()

    try:
        proc = await asyncio.create_subprocess_shell(
            req.command,
            cwd=str(cwd),
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
            stderr_bytes = f"Command timed out after {timeout}s".encode()
    except Exception as exc:
        elapsed = int((time.monotonic() - start) * 1000)
        logger.exception("Command execution failed")
        return ExecuteResponse(
            stdout="",
            stderr=f"Execution error: {exc}",
            exit_code=-1,
            elapsed_ms=elapsed,
            timed_out=False,
        )

    elapsed = int((time.monotonic() - start) * 1000)

    def _decode(raw: bytes) -> str:
        text = raw.decode("utf-8", errors="replace")
        if len(text) > MAX_OUTPUT_BYTES:
            return text[:MAX_OUTPUT_BYTES] + "\n... [truncated]"
        return text

    return ExecuteResponse(
        stdout=_decode(stdout_bytes),
        stderr=_decode(stderr_bytes),
        exit_code=proc.returncode if proc.returncode is not None else -1,
        elapsed_ms=elapsed,
        timed_out=timed_out,
    )
