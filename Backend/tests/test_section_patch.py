"""One section saved, the rest untouched."""
from __future__ import annotations

import unittest

from core import apply_section_update


class SectionPatchTest(unittest.TestCase):
    def setUp(self):
        self.data = {"sections": [
            {"id": "sec_a", "type": "hero_banner", "title": "A", "visible": True, "tone": "dark"},
            {"id": "sec_b", "type": "product_carousel", "title": "B", "visible": True, "limit": 4},
            {"id": "sec_c", "type": "footer", "title": "C", "visible": False},
        ]}

    def test_only_the_named_section_changes(self):
        result = apply_section_update(self.data, "sec_b", {"title": "B changed", "limit": 8})
        self.assertTrue(result["found"])
        rows = {row["id"]: row for row in result["sections"]}
        self.assertEqual(rows["sec_b"]["title"], "B changed")
        self.assertEqual(rows["sec_b"]["limit"], 8)
        # untouched neighbours, byte for byte
        self.assertEqual(rows["sec_a"], self.data["sections"][0])
        self.assertEqual(rows["sec_c"], self.data["sections"][2])
        self.assertEqual(len(result["sections"]), 3)

    def test_the_type_and_id_survive_whatever_is_sent(self):
        result = apply_section_update(self.data, "sec_a", {"type": "", "id": "ignored"})
        self.assertEqual(result["section"]["id"], "sec_a")
        self.assertEqual(result["section"]["type"], "hero_banner")

    def test_an_unknown_section_is_reported(self):
        result = apply_section_update(self.data, "sec_missing", {"title": "x"})
        self.assertFalse(result["found"])
        self.assertEqual(len(result["sections"]), 3)
        self.assertEqual(result["sections"], self.data["sections"])

    def test_the_original_data_is_not_mutated(self):
        before = [dict(row) for row in self.data["sections"]]
        apply_section_update(self.data, "sec_b", {"title": "changed"})
        self.assertEqual(self.data["sections"], before)
