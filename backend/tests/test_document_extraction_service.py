"""
Unit tests for document_extraction_service.

Tests cover cache handling, layout annotation integration, and error paths.
OCR/pipeline logic is not tested (requires PaddleOCR).
"""

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app.services.document_extraction_service import (
    _ensure_layout_boxes_annotated,
    _load_cached_result,
    _save_cached_result,
    get_cached_document,
)


class TestEnsureLayoutBoxesAnnotated(unittest.TestCase):
    """Tests for _ensure_layout_boxes_annotated integration."""

    def test_adds_block_index_to_layout_boxes(self) -> None:
        result = {
            "parsing_res_list": [
                {"label": "text", "bbox": [0, 0, 100, 50]},
                {"label": "chart", "bbox": [0, 60, 100, 150]},
            ],
            "layout_det_res": [
                {
                    "boxes": [
                        {"coordinate": [0, 0, 100, 50]},
                        {"coordinate": [0, 60, 100, 150]},
                    ]
                }
            ],
        }
        out = _ensure_layout_boxes_annotated(result)
        self.assertIs(out, result)
        self.assertEqual(result["layout_det_res"][0]["boxes"][0]["block_index"], 0)
        self.assertEqual(result["layout_det_res"][0]["boxes"][1]["block_index"], 1)

    def test_no_layout_det_res(self) -> None:
        result = {"parsing_res_list": [{"bbox": [0, 0, 10, 10]}], "layout_det_res": None}
        out = _ensure_layout_boxes_annotated(result)
        self.assertIs(out, result)

    def test_empty_parsing_res_list(self) -> None:
        result = {
            "parsing_res_list": [],
            "layout_det_res": [{"boxes": [{"coordinate": [0, 0, 10, 10]}]}],
        }
        out = _ensure_layout_boxes_annotated(result)
        self.assertIs(out, result)
        self.assertNotIn("block_index", result["layout_det_res"][0]["boxes"][0])


class TestCacheOperations(unittest.TestCase):
    """Tests for cache load/save."""

    def setUp(self) -> None:
        self.tmpdir = Path(tempfile.mkdtemp())

    def tearDown(self) -> None:
        import shutil
        if self.tmpdir.exists():
            shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_save_and_load(self) -> None:
        from app.services import document_extraction_service as svc
        original = svc._CACHE_DIR
        try:
            svc._CACHE_DIR = self.tmpdir
            sha = "a" * 64
            result = {"parsing_res_list": [{"bbox": [0, 0, 10, 10]}], "layout_det_res": []}
            _save_cached_result(sha, result)
            loaded = _load_cached_result(sha)
            self.assertIsNotNone(loaded)
            self.assertEqual(loaded["parsing_res_list"][0]["bbox"], [0, 0, 10, 10])
        finally:
            svc._CACHE_DIR = original

    def test_load_nonexistent_returns_none(self) -> None:
        from app.services import document_extraction_service as svc
        original = svc._CACHE_DIR
        try:
            svc._CACHE_DIR = self.tmpdir
            self.assertIsNone(_load_cached_result("b" * 64))
        finally:
            svc._CACHE_DIR = original


class TestGetCachedDocument(unittest.TestCase):
    """Tests for get_cached_document."""

    def test_invalid_hash_returns_none(self) -> None:
        self.assertIsNone(get_cached_document("short"))
        self.assertIsNone(get_cached_document("x" * 64))  # invalid hex
        self.assertIsNone(get_cached_document("G" * 64))  # invalid char

    @patch("app.services.document_extraction_service._load_cached_result")
    def test_annotates_on_load(self, mock_load: object) -> None:
        mock_load.return_value = {
            "parsing_res_list": [{"label": "text", "bbox": [0, 0, 50, 20]}],
            "layout_det_res": [{"boxes": [{"coordinate": [0, 0, 50, 20]}]}],
        }
        result = get_cached_document("a" * 64)
        self.assertIsNotNone(result)
        self.assertEqual(result["layout_det_res"][0]["boxes"][0]["block_index"], 0)

    @patch("app.services.document_extraction_service._load_cached_result")
    def test_adds_file_hash_if_missing(self, mock_load: object) -> None:
        sha = "c" * 64
        mock_load.return_value = {"parsing_res_list": [], "layout_det_res": []}
        result = get_cached_document(sha)
        self.assertIsNotNone(result)
        self.assertEqual(result["file_hash"], sha)


if __name__ == "__main__":
    unittest.main()
