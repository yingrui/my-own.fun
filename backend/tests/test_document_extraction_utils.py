"""
Unit tests for document_extraction_utils.
"""

import unittest

import numpy as np

from app.services.document_extraction_utils import (
    annotate_layout_boxes_with_block_index,
    bbox_iou,
    find_best_matching_block,
    iter_layout_boxes,
    to_serializable,
)


class TestBboxIou(unittest.TestCase):
    """Tests for bbox_iou."""

    def test_exact_match(self) -> None:
        a = [10, 20, 50, 60]
        self.assertAlmostEqual(bbox_iou(a, a), 1.0)

    def test_no_overlap(self) -> None:
        a = [0, 0, 10, 10]
        b = [20, 20, 30, 30]
        self.assertAlmostEqual(bbox_iou(a, b), 0.0)

    def test_partial_overlap(self) -> None:
        # a: 0,0 to 20,20 (400 area); b: 10,10 to 30,30 (400 area)
        # intersection: 10,10 to 20,20 = 100; union = 400+400-100 = 700
        a = [0, 0, 20, 20]
        b = [10, 10, 30, 30]
        expected = 100 / 700
        self.assertAlmostEqual(bbox_iou(a, b), expected)

    def test_one_contains_other(self) -> None:
        # b fully inside a
        a = [0, 0, 100, 100]
        b = [25, 25, 75, 75]
        # intersection = 50*50 = 2500; union = 10000 + 2500 - 2500 = 10000
        self.assertAlmostEqual(bbox_iou(a, b), 0.25)

    def test_insufficient_coords(self) -> None:
        self.assertAlmostEqual(bbox_iou([1, 2], [1, 2, 3, 4]), 0.0)
        self.assertAlmostEqual(bbox_iou([], []), 0.0)

    def test_float_coords(self) -> None:
        a = [10.5, 20.5, 50.5, 60.5]
        self.assertAlmostEqual(bbox_iou(a, a), 1.0)


class TestFindBestMatchingBlock(unittest.TestCase):
    """Tests for find_best_matching_block."""

    def test_exact_match(self) -> None:
        coord = [10, 20, 50, 60]
        blocks = [
            {"bbox": [0, 0, 5, 5]},
            {"bbox": [10, 20, 50, 60]},
            {"bbox": [100, 100, 200, 200]},
        ]
        self.assertEqual(find_best_matching_block(coord, blocks), 1)

    def test_no_match_below_threshold(self) -> None:
        coord = [0, 0, 10, 10]
        blocks = [{"bbox": [100, 100, 200, 200]}]  # no overlap
        self.assertEqual(find_best_matching_block(coord, blocks), -1)

    def test_empty_blocks(self) -> None:
        self.assertEqual(find_best_matching_block([0, 0, 10, 10], []), -1)

    def test_invalid_coord(self) -> None:
        self.assertEqual(find_best_matching_block([], [{"bbox": [0, 0, 10, 10]}]), -1)
        self.assertEqual(find_best_matching_block([1, 2], [{"bbox": [0, 0, 10, 10]}]), -1)

    def test_highest_iou_wins(self) -> None:
        coord = [0, 0, 20, 20]
        blocks = [
            {"bbox": [5, 5, 15, 15]},   # IoU ~ 0.14
            {"bbox": [0, 0, 20, 20]},    # IoU 1.0
            {"bbox": [10, 10, 30, 30]},  # IoU ~ 0.14
        ]
        self.assertEqual(find_best_matching_block(coord, blocks), 1)


class TestIterLayoutBoxes(unittest.TestCase):
    """Tests for iter_layout_boxes."""

    def test_list_of_pages(self) -> None:
        layout = [
            {"boxes": [{"coordinate": [0, 0, 10, 10]}]},
            {"boxes": [{"coordinate": [0, 10, 10, 20]}]},
        ]
        boxes = iter_layout_boxes(layout)
        self.assertEqual(len(boxes), 2)
        self.assertEqual(boxes[0]["coordinate"], [0, 0, 10, 10])

    def test_single_page_dict(self) -> None:
        layout = {"boxes": [{"coordinate": [1, 2, 3, 4]}]}
        boxes = iter_layout_boxes(layout)
        self.assertEqual(len(boxes), 1)
        self.assertEqual(boxes[0]["coordinate"], [1, 2, 3, 4])

    def test_empty(self) -> None:
        self.assertEqual(iter_layout_boxes([]), [])
        self.assertEqual(iter_layout_boxes({"boxes": []}), [])
        self.assertEqual(iter_layout_boxes({}), [])

    def test_skips_non_dict_boxes(self) -> None:
        layout = {"boxes": [{"coordinate": [0, 0, 1, 1]}, "not-a-dict", None]}
        boxes = iter_layout_boxes(layout)
        self.assertEqual(len(boxes), 1)


class TestAnnotateLayoutBoxesWithBlockIndex(unittest.TestCase):
    """Tests for annotate_layout_boxes_with_block_index."""

    def test_chart_maps_to_exact_bbox_block(self) -> None:
        """Chart layout box should map to block with identical bbox (block 41 case)."""
        layout = [
            {
                "boxes": [
                    {"coordinate": [103, 182, 515, 571], "label": "chart"},
                ]
            }
        ]
        blocks = [
            {"bbox": [978, 1200, 1004, 1222], "label": "formula_number"},
            {"bbox": [103, 182, 515, 571], "label": "chart"},
            {"bbox": [128, 185, 482, 1325], "label": "table"},
        ]
        annotate_layout_boxes_with_block_index(layout, blocks)
        self.assertEqual(layout[0]["boxes"][0]["block_index"], 1)

    def test_no_blocks(self) -> None:
        layout = [{"boxes": [{"coordinate": [0, 0, 10, 10]}]}]
        annotate_layout_boxes_with_block_index(layout, [])
        self.assertNotIn("block_index", layout[0]["boxes"][0])

    def test_box_without_valid_coord_unchanged(self) -> None:
        layout = [{"boxes": [{"coordinate": []}, {"coordinate": [0, 0, 10, 10]}]}]
        blocks = [{"bbox": [0, 0, 10, 10]}]
        annotate_layout_boxes_with_block_index(layout, blocks)
        self.assertNotIn("block_index", layout[0]["boxes"][0])
        self.assertEqual(layout[0]["boxes"][1]["block_index"], 0)

    def test_empty_layout(self) -> None:
        result = annotate_layout_boxes_with_block_index([], [{"bbox": [0, 0, 10, 10]}])
        self.assertEqual(result, [])

    def test_mutates_in_place(self) -> None:
        box = {"coordinate": [0, 0, 10, 10]}
        layout = [{"boxes": [box]}]
        blocks = [{"bbox": [0, 0, 10, 10]}]
        annotate_layout_boxes_with_block_index(layout, blocks)
        self.assertIs(box, layout[0]["boxes"][0])
        self.assertEqual(box["block_index"], 0)


class TestToSerializable(unittest.TestCase):
    """Tests for to_serializable."""

    def test_numpy_array(self) -> None:
        arr = np.array([[1, 2], [3, 4]])
        result = to_serializable(arr)
        self.assertEqual(result, [[1, 2], [3, 4]])

    def test_numpy_int(self) -> None:
        self.assertEqual(to_serializable(np.int64(42)), 42)

    def test_numpy_float(self) -> None:
        self.assertEqual(to_serializable(np.float64(3.14)), 3.14)

    def test_dict_recursion(self) -> None:
        obj = {"a": np.array([1, 2]), "b": 3}
        result = to_serializable(obj)
        self.assertEqual(result, {"a": [1, 2], "b": 3})

    def test_list_recursion(self) -> None:
        obj = [np.array([1]), 2]
        result = to_serializable(obj)
        self.assertEqual(result, [[1], 2])

    def test_passthrough(self) -> None:
        self.assertEqual(to_serializable(42), 42)
        self.assertEqual(to_serializable("hello"), "hello")
        self.assertEqual(to_serializable(None), None)


if __name__ == "__main__":
    unittest.main()
