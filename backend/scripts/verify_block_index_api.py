#!/usr/bin/env python3
"""
Verify that GET /api/v1/documents/{file_hash} returns block_index in layout_det_res.
Run with backend running: python scripts/verify_block_index_api.py [file_hash]
"""
import json
import sys
import urllib.request
import urllib.error

BASE = "http://localhost:8100/api/v1"
# Default: hash from result.json in .cache
DEFAULT_HASH = "f3b3be345bf2df8979f2491ca9466e078e4fd1d6a216611faa8566e4c44d474b"


def main():
    file_hash = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_HASH
    url = f"{BASE}/documents/{file_hash}"
    print(f"Fetching {url} ...")
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        print(f"HTTP error {e.code}: {e.reason}")
        if e.fp:
            body = e.fp.read().decode()
            print(body[:500])
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"URL error: {e.reason}")
        sys.exit(1)

    success = data.get("success")
    result = data.get("data")
    if not success or not result:
        print("Response missing success or data")
        sys.exit(1)

    layout = result.get("layout_det_res")
    if layout is None:
        print("ERROR: layout_det_res is missing from response")
        sys.exit(1)

    pages = layout if isinstance(layout, list) else [layout]
    total_boxes = 0
    boxes_with_index = 0
    sample_indices = []

    for i, page in enumerate(pages):
        boxes = page.get("boxes", []) if isinstance(page, dict) else []
        for b in boxes:
            if isinstance(b, dict):
                total_boxes += 1
                if "block_index" in b and isinstance(b["block_index"], (int, float)):
                    boxes_with_index += 1
                    if len(sample_indices) < 5:
                        sample_indices.append((i, b.get("block_index"), b.get("label")))

    print(f"layout_det_res: {len(pages)} page(s)")
    print(f"Total boxes: {total_boxes}")
    print(f"Boxes with block_index: {boxes_with_index}")
    if sample_indices:
        print("Sample block_index values: ", sample_indices)
    if total_boxes > 0 and boxes_with_index == 0:
        print("\n*** FAIL: No block_index found in any layout box ***")
        sys.exit(1)
    if total_boxes > 0 and boxes_with_index < total_boxes:
        print(f"\nWARN: {total_boxes - boxes_with_index} boxes without block_index")
    else:
        print("\n*** OK: block_index present ***")


if __name__ == "__main__":
    main()
