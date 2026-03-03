# VLM Server (MLX-VLM)

Runs the MLX-VLM server for PaddleOCR document extraction. The backend expects this server at `http://localhost:8101/`.

## Setup

```bash
pip install -r requirements.txt
```

## Start Server

```bash
# Default port 8101 (matches backend config)
./start.sh

# Or use mlx_vlm directly
mlx_vlm.server --port 8101

# Custom port
mlx_vlm.server --port 8102
```

## Options

- `--port`: Port number (default: 8080 in mlx-vlm; use 8101 for backend compatibility)
- `--host`: Host address (default: 0.0.0.0)
- `--trust-remote-code`: Required for some models (e.g. PaddleOCR-VL)

Some models may need `--trust-remote-code`:

```bash
mlx_vlm.server --port 8101 --trust-remote-code
```
