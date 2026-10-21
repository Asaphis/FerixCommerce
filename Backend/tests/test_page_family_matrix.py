"""Each page kind offers only the sections it can actually draw."""
from __future__ import annotations

import unittest

from cms_sections import FAMILY_PAGE_KINDS, palette_for


def families(document_type: str) -> set:
    return {group["id"] for group in palette_for(document_type)}


class PageFamilyMatrixTest(unittest.TestCase):
    def test_information_pages_are_offered_no_sections(self):
        for document_type in ("information", "marketplace_about", "marketplace_contact",
                              "marketplace_faq", "marketplace_terms"):
            self.assertEqual(families(document_type), set(),
                             f"{document_type} draws content fields only")

    def test_the_storefront_can_be_configured(self):
        offered = families("marketplace_store")
        self.assertIn("hero", offered)
        self.assertIn("category", offered)
        self.assertNotIn("product_template", offered)

    def test_the_product_page_only_offers_its_template_blocks(self):
        self.assertEqual(families("marketplace_product"), {"product_template"})

    def test_the_home_and_explore_pages_offer_the_whole_shelf(self):
        for document_type in ("marketplace_home", "marketplace_explore"):
            offered = families(document_type)
            self.assertIn("hero", offered)
            self.assertIn("product", offered)
            self.assertNotIn("product_template", offered)

    def test_every_family_declares_at_least_one_page(self):
        for family, pages in FAMILY_PAGE_KINDS.items():
            self.assertTrue(pages, f"{family} belongs somewhere")
