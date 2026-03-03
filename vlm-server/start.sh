#!/usr/bin/env bash
# Start MLX-VLM server for PaddleOCR document extraction.
# Backend expects server at http://localhost:8101/
#
# Usage:
#   ./start.sh                    # default port 8101
#   ./start.sh --port 8102        # custom port
#   ./start.sh --trust-remote-code # required for some models
#   PORT=8102 ./start.sh          # override via env

set -e
cd "$(dirname "$0")"

# Ensure mlx-vlm is installed
if ! python -c "import mlx_vlm.server" 2>/dev/null; then
  echo "Installing mlx-vlm..."
  pip install -r requirements.txt
fi

# Add --port 8101 unless already specified (backend default)
if [[ " $* " != *" --port "* ]]; then
  set -- --port "${PORT:-8101}" "$@"
fi

exec mlx_vlm.server "$@"
