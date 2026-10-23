"""A saved colour must reach the storefront under the name it reads."""
from __future__ import annotations

import unittest

from core import section_colour_aliases


class ColourAliasTest(unittest.TestCase):
    def test_the_editor_names_are_copied_to_the_renderer_names(self):
        row = section_colour_aliases({
            "id": "sec_1",
            "background": "linear-gradient(135deg, #0B1F30 0%, #6E2A18 100%)",
            "accent": "#F05A28",
            "text": "#FFFFFF",
            "timerBackground": "#FFB38A",
            "timerInk": "#12263A",
        })
        self.assertEqual(row["backgroundColor"], row["background"])
        self.assertEqual(row["accentColor"], "#F05A28")
        self.assertEqual(row["textColor"], "#FFFFFF")
        self.assertEqual(row["timerBackgroundColor"], "#FFB38A")
        self.assertEqual(row["timerTextColor"], "#12263A")
        self.assertEqual(row["accent"], "#F05A28")

    def test_an_explicit_color_key_wins(self):
        row = section_colour_aliases({"accent": "#000000", "accentColor": "#FFFFFF"})
        self.assertEqual(row["accentColor"], "#FFFFFF")

    def test_nothing_else_is_touched(self):
        original = {"id": "sec_2", "title": "Flash Deal", "background": "", "limit": 8}
        row = section_colour_aliases(original)
        self.assertNotIn("backgroundColor", row)
        self.assertEqual(row["title"], "Flash Deal")
        self.assertEqual(row["limit"], 8)
        self.assertEqual(original, {"id": "sec_2", "title": "Flash Deal", "background": "", "limit": 8})
