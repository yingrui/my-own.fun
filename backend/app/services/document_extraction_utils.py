"""
Pure utility functions for document extraction.
These are stateless and easily testable in isolation.
"""

from typing import Any, List

import numpy as np


# ---------------------------------------------------------------------------
# Bbox utilities
# ---------------------------------------------------------------------------


def bbox_iou(a: List[float], b: List[float]) -> float:
    """
    Compute Intersection over Union of two axis-aligned rects [x1, y1, x2, y2].
    Returns 0..1, where 1.0 = exact match.
    """
    if len(a) < 4 or len(b) < 4:
        return 0.0
    ax1, ay1, ax2, ay2 = float(a[0]), float(a[1]), float(a[2]), float(a[3])
    bx1, by1, bx2, by2 = float(b[0]), float(b[1]), float(b[2]), float(b[3])
    ix1 = max(ax1, bx1)
    iy1 = max(ay1, by1)
    ix2 = min(ax2, bx2)
    iy2 = min(ay2, by2)
    iw = max(0.0, ix2 - ix1)
    ih = max(0.0, iy2 - iy1)
    inter = iw * ih
    area_a = (ax2 - ax1) * (ay2 - ay1)
    area_b = (bx2 - bx1) * (by2 - by1)
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


def find_best_matching_block(
    layout_coord: List[float],
    blocks: List[dict],
    iou_threshold: float = 0.1,
) -> int:
    """
    Find the block index with highest bbox IoU for a layout box coordinate.
    Returns -1 if no match above threshold.
    """
    if not layout_coord or len(layout_coord) < 4:
        return -1
    best_idx = -1
    best_iou = 0.0
    for idx, block in enumerate(blocks):
        block_bbox = block.get("bbox") if isinstance(block, dict) else []
        if not block_bbox or len(block_bbox) < 4:
            continue
        iou = bbox_iou(block_bbox, layout_coord)
        if iou > best_iou and iou > iou_threshold:
            best_iou = iou
            best_idx = idx
    return best_idx


# ---------------------------------------------------------------------------
# Layout annotation
# ---------------------------------------------------------------------------


def iter_layout_boxes(layout_det: Any) -> List[dict]:
    """Collect all layout box dicts from layout_det_res (list or single-page dict)."""
    boxes: List[dict] = []
    if isinstance(layout_det, list):
        for page_item in layout_det:
            if isinstance(page_item, dict) and "boxes" in page_item:
                for b in page_item.get("boxes") or []:
                    if isinstance(b, dict):
                        boxes.append(b)
    elif isinstance(layout_det, dict) and "boxes" in layout_det:
        for b in layout_det.get("boxes") or []:
            if isinstance(b, dict):
                boxes.append(b)
    return boxes


def annotate_layout_boxes_with_block_index(
    layout_det: Any,
    blocks: List[dict],
    iou_threshold: float = 0.1,
) -> Any:
    """
    Add block_index to each layout box by finding the parsing block with best bbox match.
    For each layout box, search ALL blocks for the highest IoU.
    Mutates layout boxes in place; returns layout_det for chaining.
    """
    if not blocks:
        return layout_det
    for box in iter_layout_boxes(layout_det):
        coord = box.get("coordinate")
        idx = find_best_matching_block(coord, blocks, iou_threshold)
        if idx >= 0:
            box["block_index"] = idx
    return layout_det


# ---------------------------------------------------------------------------
# Serialization
# ---------------------------------------------------------------------------


def to_serializable(obj: Any) -> Any:
    """Convert numpy arrays and other non-JSON-serializable types to JSON-safe values."""
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, (np.integer, np.floating)):
        return float(obj) if isinstance(obj, np.floating) else int(obj)
    if isinstance(obj, dict):
        return {k: to_serializable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [to_serializable(v) for v in obj]
    return obj
