"""
Document extraction service using PaddleOCR doc_parser.
Loads model lazily and extracts structured content from images/PDFs.
Results and images are cached in .cache/{sha256}/ by document content hash:
  - .cache/{sha256}/result.json
  - .cache/{sha256}/*.png (images)
"""

import hashlib
import json
import logging
import os
import tempfile
from pathlib import Path
from typing import Any, Optional

import numpy as np

from app.services.document_extraction_utils import annotate_layout_boxes_with_block_index

logger = logging.getLogger(__name__)

# Lazy-loaded PaddleOCR VL instance
_paddle_ocr_instance: Optional[Any] = None

# Cache directory: backend/.cache
_CACHE_DIR = Path(__file__).resolve().parent.parent.parent / ".cache"

# Keys that contain image data (numpy/PIL) to save to disk and replace with path
_IMAGE_KEYS = frozenset({"input_img", "img", "res"})


def _get_cache_dir(sha256_hash: str) -> Path:
    """Cache dir for a document: .cache/{sha256}/"""
    return _CACHE_DIR / sha256_hash


def _array_or_pil_to_path(arr_or_img: Any, sha256_hash: str, key: str, index: int = 0) -> Optional[str]:
    """
    Save numpy array or PIL Image to .cache/{sha256}/ as PNG.
    Returns relative path like "{sha256}/{key}_{index}.png" or None.
    """
    cache_dir = _get_cache_dir(sha256_hash)
    filename = f"{key}_{index}.png"
    try:
        from PIL import Image as PILImage

        if isinstance(arr_or_img, np.ndarray):
            img = arr_or_img
            if img.size == 0 or img.ndim not in (2, 3):
                return None
            if img.dtype != np.uint8:
                img = np.clip(img, 0, 255).astype(np.uint8)
            if img.ndim == 2:
                pil_img = PILImage.fromarray(img, mode="L").convert("RGB")
            else:
                pil_img = PILImage.fromarray(img)
        elif isinstance(arr_or_img, PILImage.Image):
            pil_img = arr_or_img.convert("RGB") if arr_or_img.mode != "RGB" else arr_or_img
        else:
            return None

        cache_dir.mkdir(parents=True, exist_ok=True)
        out_path = cache_dir / filename
        pil_img.save(out_path, format="PNG")
        return f"{sha256_hash}/{filename}"
    except ImportError:
        try:
            import cv2
            if isinstance(arr_or_img, np.ndarray):
                img = arr_or_img
            else:
                img = np.array(arr_or_img)
            if img.ndim == 2:
                img = np.stack([img] * 3, axis=-1)
            if img.dtype != np.uint8:
                img = np.clip(img, 0, 255).astype(np.uint8)
            cache_dir.mkdir(parents=True, exist_ok=True)
            out_path = cache_dir / filename
            cv2.imwrite(str(out_path), img[:, :, ::-1] if img.shape[2] == 3 else img)
            return f"{sha256_hash}/{filename}"
        except Exception as e:
            logger.warning("Failed to save image %s_%s: %s", key, index, e)
            return None
    except Exception as e:
        logger.warning("Failed to save image %s_%s: %s", key, index, e)
        return None


def _to_serializable(obj: Any) -> Any:
    """Convert numpy arrays and other non-JSON-serializable types."""
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, (np.integer, np.floating)):
        return float(obj) if isinstance(obj, np.floating) else int(obj)
    if isinstance(obj, dict):
        return {k: _to_serializable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_to_serializable(v) for v in obj]
    return obj


def _get_paddle_ocr():
    """Lazily load PaddleOCR VL (doc_parser) model."""
    global _paddle_ocr_instance
    if _paddle_ocr_instance is None:
        logger.info("Loading PaddleOCR doc_parser model (first use)...")
        os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")
        from paddleocr import PaddleOCRVL

        _paddle_ocr_instance = PaddleOCRVL(
            use_layout_detection=True,
            use_queues=False,
            vl_rec_backend="mlx-vlm-server", 
            vl_rec_server_url="http://localhost:8101/",
            vl_rec_api_model_name="PaddlePaddle/PaddleOCR-VL-1.5"
        )
        logger.info("PaddleOCR doc_parser model loaded")
    return _paddle_ocr_instance


def _pptx_or_ppt_to_images(file_path: str) -> tuple[list[str], tempfile.TemporaryDirectory]:
    """
    Convert pptx/ppt to PNG images using pptxtoimages (LibreOffice + pdf2image).
    Returns (sorted list of image paths, temp_dir_handle). Caller must keep
    temp_dir_handle alive until ocr.predict completes, then cleanup.
    """
    from pptxtoimages.tools import PPTXToImageConverter

    tmp = tempfile.TemporaryDirectory(prefix="doc_extract_pptx_")
    images_dir = Path(tmp.name) / "images"
    temp_dir = Path(tmp.name) / "temp"
    images_dir.mkdir(parents=True, exist_ok=True)
    converter = PPTXToImageConverter(
        str(file_path),
        output_dir=str(images_dir),
        temp_dir=str(temp_dir),
    )
    image_paths = converter.convert()
    sorted_paths = sorted(str(p) for p in (Path(p) for p in image_paths)) if image_paths else []
    return sorted_paths, tmp


def _get_document_sha256(file_path: str) -> str:
    """Compute SHA256 hash of file content as cache key."""
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _extract_markdown_from_pages(pages_res: list, sha256_hash: str) -> str:
    """
    Extract markdown using PaddleOCR save_to_markdown (pretty=True, show_formula_number=False).
    Falls back to manual build from parsing_res_list if save_to_markdown fails.
    """
    cache_dir = _get_cache_dir(sha256_hash)
    cache_dir.mkdir(parents=True, exist_ok=True)
    md_dir = cache_dir / "markdown_out"
    md_dir.mkdir(parents=True, exist_ok=True)

    try:
        for res in pages_res:
            if hasattr(res, "save_to_markdown"):
                res.save_to_markdown(
                    save_path=str(md_dir),
                    pretty=True,
                    show_formula_number=False,
                )
        # Collect and concatenate saved .md files (sorted by name for page order)
        md_files = sorted(md_dir.glob("*.md"))
        if md_files:
            parts = []
            for f in md_files:
                parts.append(f.read_text(encoding="utf-8"))
            return "\n\n".join(parts).strip()
    except Exception as e:
        logger.info("save_to_markdown failed, using fallback markdown builder: %s", e)

    # Fallback: build from parsing_res_list
    fallback_parts = []
    first = pages_res[0]
    res = first.get("res", first) if hasattr(first, "get") else getattr(first, "res", first)
    parsing_list = res.get("parsing_res_list", []) if isinstance(res, dict) else getattr(res, "parsing_res_list", [])
    def _get(obj, dk, ak, default=""):
        if isinstance(obj, dict):
            return obj.get(dk, default)
        return getattr(obj, ak, default) or default

    for item in parsing_list:
        label = _get(item, "block_label", "label", "") or ""
        content = (_get(item, "block_content", "content", "") or "").strip()
        if content:
            if label == "doc_title":
                fallback_parts.append(f"# {content}\n")
            elif label == "paragraph_title":
                fallback_parts.append(f"## {content}\n")
            else:
                fallback_parts.append(f"{content}\n")
    return "\n".join(fallback_parts).strip()


def _load_cached_result(sha256_hash: str) -> Optional[dict]:
    """Load cached parsing result if it exists. Tries .cache/{sha256}/result.json then legacy .cache/{sha256}.json."""
    cache_dir = _get_cache_dir(sha256_hash)
    for candidate in (cache_dir / "result.json", _CACHE_DIR / f"{sha256_hash}.json"):
        if candidate.exists():
            try:
                with open(candidate, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, OSError) as e:
                logger.warning("Failed to load cache %s: %s", candidate, e)
    return None


def _save_cached_result(sha256_hash: str, result: dict) -> None:
    """Save parsing result to .cache/{sha256}/result.json"""
    cache_dir = _get_cache_dir(sha256_hash)
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_path = cache_dir / "result.json"
    try:
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
    except OSError as e:
        logger.warning("Failed to save cache %s: %s", cache_path, e)


def extract_document(file_path: str) -> dict:
    """
    Extract structured content from a document (image, PDF, or pptx/ppt) using PaddleOCR.
    Uses SHA256 of file content as cache key. Returns cached result when available.

    Args:
        file_path: Path to the image, PDF, or PowerPoint (pptx/ppt) file.

    Returns:
        Dict with parsing results: layout, blocks, text content.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    sha256_hash = _get_document_sha256(file_path)
    cached = _load_cached_result(sha256_hash)
    if cached is not None:
        if "file_hash" not in cached:
            cached["file_hash"] = sha256_hash
        logger.info("Returning cached result for %s", sha256_hash[:16])
        _ensure_layout_boxes_annotated(cached)
        return cached

    ocr = _get_paddle_ocr()
    pptx_tmp: Optional[tempfile.TemporaryDirectory] = None

    try:
        if path.suffix.lower() in (".pptx", ".ppt"):
            image_paths, pptx_tmp = _pptx_or_ppt_to_images(file_path)
            if not image_paths:
                return {
                    "file_hash": sha256_hash,
                    "parsing_res_list": [],
                    "layout_det_res": {},
                    "markdown": "",
                }
            predict_input: str | list[str] = image_paths
        else:
            predict_input = file_path

        pages_res = list(ocr.predict(input=predict_input))
    finally:
        if pptx_tmp is not None:
            try:
                pptx_tmp.cleanup()
            except Exception:
                pass

    if not pages_res:
        return {"parsing_res_list": [], "layout_det_res": {}, "markdown": ""}

    # For multi-page PDFs and pptx/ppt: merge tables, relevel titles, concatenate pages
    if len(pages_res) > 1 and path.suffix.lower() in (".pdf", ".pptx", ".ppt"):
        pages_res = list(
            ocr.restructure_pages(
                pages_res,
                merge_tables=True,
                relevel_titles=True,
                concatenate_pages=True,
            )
        )

    res = pages_res[0].get("res", pages_res[0])
    parsing_list = res.get("parsing_res_list", [])
    layout_det = res.get("layout_det_res", {})

    # Get markdown via save_to_markdown (pretty=True, show_formula_number=False) or fallback to manual build
    markdown = _extract_markdown_from_pages(pages_res, sha256_hash)

    # Build simplified blocks
    # parsing_list contains PaddleOCRVLBlock objects (label, content, bbox) or dicts
    blocks = []

    def _get_block_field(item, dict_key: str, attr_name: str, default=None):
        if hasattr(item, attr_name):
            return getattr(item, attr_name)
        if isinstance(item, dict):
            return item.get(dict_key, default)
        return default

    img_counter: dict[str, int] = {}

    def _next_img_idx(k: str) -> int:
        idx = img_counter.get(k, 0)
        img_counter[k] = idx + 1
        return idx

    for item in parsing_list:
        label = _get_block_field(item, "block_label", "label", "") or ""
        content = (_get_block_field(item, "block_content", "content", "") or "").strip()
        bbox = _get_block_field(item, "block_bbox", "bbox", []) or []
        block_img_path: Optional[str] = None

        block_image = _get_block_field(item, "image", "image", None)
        if block_image is not None:
            img_data = block_image.get("img") if isinstance(block_image, dict) else getattr(block_image, "img", None)
            if img_data is not None:
                saved = _array_or_pil_to_path(img_data, sha256_hash, "block", _next_img_idx("block"))
                if saved:
                    block_img_path = saved

        block_data: dict[str, Any] = {
            "label": label,
            "content": content,
            "bbox": bbox,
        }
        if block_img_path:
            block_data["image_path"] = block_img_path
        blocks.append(block_data)

    def _save_img_val(val: Any, key: str) -> Any:
        """Save image (numpy/PIL) to cache; return path or serialized fallback."""
        if val is None:
            return None
        p = _array_or_pil_to_path(val, sha256_hash, key, _next_img_idx(key))
        return p if p else _to_serializable(val)

    def _process_layout_det(ld: Any, prefix: str = "layout_det") -> Any:
        """Recurse through layout_det; save image values, serialize the rest."""
        if isinstance(ld, dict):
            out = {}
            for k, v in ld.items():
                if k in _IMAGE_KEYS and v is not None:
                    out[k] = _save_img_val(v, f"{prefix}_{k}")
                elif isinstance(v, (dict, list)):
                    out[k] = _process_layout_det(v, f"{prefix}_{k}")
                else:
                    out[k] = _to_serializable(v)
            return out
        if isinstance(ld, list):
            return [_process_layout_det(x, f"{prefix}_{i}") for i, x in enumerate(ld)]
        return _to_serializable(ld)

    # layout_det_res: dict, BaseResult (.img["res"]), or list of same
    layout_det_out: Any
    if hasattr(layout_det, "img") and getattr(layout_det, "img", None):
        img_dict = layout_det.img if isinstance(getattr(layout_det, "img"), dict) else {}
        layout_img_paths = {}
        for k, v in img_dict.items():
            if v is not None:
                p = _save_img_val(v, f"layout_det_img_{k}")
                if isinstance(p, str):
                    layout_img_paths[k] = p
        raw = layout_det.get("res", layout_det) if hasattr(layout_det, "get") else layout_det
        layout_det_out = _process_layout_det(raw, "layout_det")
        if isinstance(layout_det_out, dict) and layout_img_paths:
            layout_det_out["_images"] = layout_img_paths
    elif isinstance(layout_det, list):
        layout_det_out = []
        for i, ld in enumerate(layout_det):
            if hasattr(ld, "img") and getattr(ld, "img", None) and isinstance(ld.img, dict):
                img_paths = {}
                for k, v in ld.img.items():
                    if v is not None:
                        p = _save_img_val(v, f"layout_det_{i}_{k}")
                        if isinstance(p, str):
                            img_paths[k] = p
                raw = ld.get("res", ld) if hasattr(ld, "get") else ld
                item = _process_layout_det(raw, f"layout_det_{i}")
                if isinstance(item, dict) and img_paths:
                    item["_images"] = img_paths
                layout_det_out.append(item)
            else:
                layout_det_out.append(_process_layout_det(ld, f"layout_det_{i}"))
    else:
        layout_det_out = _process_layout_det(layout_det, "layout_det")

    # Annotate layout boxes with block_index (box→block bbox IoU matching)
    layout_det_out = annotate_layout_boxes_with_block_index(layout_det_out, blocks)

    # Save result visualization images (PaddleOCRVLResult.img)
    result_images: dict[str, str] = {}
    try:
        first_res = pages_res[0]
        if hasattr(first_res, "img") and first_res.img:
            for k, v in first_res.img.items():
                if v is not None:
                    p = _save_img_val(v, f"result_{k}")
                    if isinstance(p, str):
                        result_images[k] = p
    except Exception as e:
        logger.debug("Could not extract result.img: %s", e)

    result = {
        "file_hash": sha256_hash,
        "parsing_res_list": blocks,
        "layout_det_res": layout_det_out,
        "markdown": markdown,
        "width": res.get("width"),
        "height": res.get("height"),
        "page_count": res.get("page_count"),
    }
    if result_images:
        result["images"] = result_images

    _save_cached_result(sha256_hash, result)
    return result


def _ensure_layout_boxes_annotated(result: dict) -> dict:
    """Run block_index annotation on layout boxes before returning."""
    layout_det = result.get("layout_det_res")
    blocks = result.get("parsing_res_list")
    if layout_det is not None and blocks:
        annotate_layout_boxes_with_block_index(layout_det, blocks)
    return result


def get_cached_document(file_hash: str) -> Optional[dict]:
    """
    Load cached extraction result by file hash.
    Returns None if cache does not exist.
    Re-annotates layout boxes with block_index on load.
    """
    if len(file_hash) != 64 or not all(c in "0123456789abcdef" for c in file_hash.lower()):
        return None
    result = _load_cached_result(file_hash)
    if result is not None:
        if "file_hash" not in result:
            result["file_hash"] = file_hash
        _ensure_layout_boxes_annotated(result)
    return result


def close_extraction_service():
    """Release PaddleOCR model resources."""
    global _paddle_ocr_instance
    if _paddle_ocr_instance is not None:
        try:
            _paddle_ocr_instance.close()
        except Exception:
            pass
        _paddle_ocr_instance = None
        logger.info("PaddleOCR doc_parser model unloaded")
