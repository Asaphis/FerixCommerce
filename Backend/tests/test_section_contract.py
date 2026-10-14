"""The CMS section contract: what a section is, who fills it, when it is live.

Run from Backend with: python -m unittest discover -s tests -v

These tests hold the line the CMS, the storefront and the product forms all
depend on:

* a section type offered in the palette is one the storefront can render;
* an automatic product feed is never offered as something a person fills in;
* a Flash Sale is a manual section that carries its own campaign settings;
* a section outside its own window is not on the shop at all.
"""
from __future__ import annotations

import os
import tempfile
import unittest
from types import SimpleNamespace

_DB = tempfile.NamedTemporaryFile(prefix="ferixas-section-contract-", suffix=".db", delete=False)
_DB.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_DB.name}"
os.environ["FERIXAS_ENV"] = "test"
os.environ["FERIXAS_TEST_STAFF_PASSWORD"] = "TestOnly-Password-123!"

from fastapi.testclient import TestClient  # noqa: E402
from app import app  # noqa: E402
from core import ContentDocument, SectionPlacement, SessionLocal, is_assignable_product_section  # noqa: E402
from cms_sections import (ALL_SOURCES, AUTOMATIC_SOURCES, FLASH_SALE_DEFAULTS, LEGACY_SOURCES,
                          PALETTE, PRESENTATIONS, SELECTION_AUTOMATIC, SELECTION_MANUAL,
                          apply_placement_overrides, is_manual_product_section, normalize_section, section_is_live,
                          selection_mode_of, source_of, validate_section)  # noqa: E402
from test_support import reset_test_database  # noqa: E402
from fixtures import create_test_records  # noqa: E402

# Every type the storefront's section renderer answers to. A palette button that
# is not in this set would add a section nothing draws.
RENDERABLE_TYPES = {
    "hero_banner", "hero_slim", "promo_strip", "promo_slots", "category_grid",
    "brand_carousel", "product_carousel", "product_grid", "featured_stores",
    "featured_collection", "footer", "product_gallery", "buy_box",
    "delivery_block", "reviews",
}


class SectionContractTest(unittest.TestCase):
    def setUp(self):
        reset_test_database()
        self.client = TestClient(app)
        self.client.__enter__()
        create_test_records()
        admin = self.client.post("/admin/login", json={
            "email": "admin@ferixas.test", "password": "TestOnly-Password-123!",
        })
        self.assertEqual(admin.status_code, 200, admin.text)
        self.admin = admin.json()["token"]

    def tearDown(self):
        self.client.__exit__(None, None, None)

    def test_every_palette_button_is_a_section_the_storefront_can_draw(self):
        entries = [entry for group in PALETTE for entry in group["entries"]]
        self.assertTrue(entries, "The palette cannot be empty.")
        unknown = sorted({entry["type"] for entry in entries} - RENDERABLE_TYPES)
        self.assertEqual(unknown, [], f"The storefront cannot render: {unknown}")
        # Buttons are buttons: each one is labelled and has a stable id.
        for entry in entries:
            self.assertTrue(entry.get("label"), entry)
            self.assertTrue(entry.get("id"), entry)

    def test_palette_is_family_based_and_product_is_configured_not_preset(self):
        groups = {group["id"]: group for group in PALETTE}
        self.assertIn("hero", groups)
        self.assertIn("category", groups)
        self.assertIn("brand", groups)
        self.assertEqual({entry["type"] for entry in groups["hero"]["entries"]}, {"hero_banner", "hero_slim"})
        self.assertEqual(groups["category"]["entries"][0]["type"], "category_grid")
        self.assertEqual(groups["brand"]["entries"][0]["type"], "brand_carousel")
        product_entries = groups["product"]["entries"]
        self.assertEqual(len(product_entries), 1)
        self.assertTrue(product_entries[0]["asksSource"])
        self.assertEqual(product_entries[0]["id"], "product_section")
        self.assertFalse(any(entry.get("presentation") == "flash_sale" for entry in product_entries))
        self.assertFalse(any(group["id"] == "automatic_products" for group in PALETTE))

    def test_legacy_featured_and_flash_sale_sources_become_manual_sections(self):
        for legacy_source in ("featured", "flash_sale"):
            legacy = {"id": f"sec_{legacy_source}", "type": "product_carousel", "source": legacy_source}
            self.assertTrue(is_manual_product_section(legacy), legacy_source)
            self.assertEqual(source_of(legacy), "assigned", legacy_source)
            self.assertEqual(normalize_section(legacy)["source"], "assigned", legacy_source)
        self.assertNotIn("featured", AUTOMATIC_SOURCES)

    def test_product_card_uses_section_offer_price_and_compare_at(self):
        base = {"id": "prd_test", "price": 120, "compareAt": 130, "availableQuantity": 8}
        row = SimpleNamespace(price=75, compare_at=120, quantity=3, section_id="sec_offer", config={})
        card = apply_placement_overrides(base, row)
        self.assertEqual(card["price"], 75)
        self.assertEqual(card["sectionPrice"], 75)
        self.assertEqual(card["compareAt"], 120)
        self.assertEqual(card["sectionQuantity"], 3)

        compare_only = SimpleNamespace(price=120, compare_at=150, quantity=0, section_id="sec_offer", config={})
        card = apply_placement_overrides(base, compare_only)
        self.assertEqual(card["price"], 120)
        self.assertEqual(card["sectionPrice"], 120)
        self.assertEqual(card["compareAt"], 150)

        cleared = SimpleNamespace(price=120, compare_at=0, quantity=0, section_id="sec_offer", config={})
        card = apply_placement_overrides(base, cleared)
        self.assertIsNone(card["compareAt"])

    def test_automatic_sources_are_never_manual_placement_destinations(self):
        document = ContentDocument(id="doc_probe", title="Probe", document_type="marketplace_home",
                                   status="published", owner_type="platform", data={"sections": []})
        for source in sorted(AUTOMATIC_SOURCES):
            section = {"id": f"sec_{source}", "type": "product_carousel", "source": source,
                       "selectionMode": SELECTION_AUTOMATIC}
            self.assertFalse(is_manual_product_section(section), source)
            self.assertFalse(is_assignable_product_section(document, section), source)
        manual = {"id": "sec_manual", "type": "product_carousel", "source": "assigned",
                  "selectionMode": SELECTION_MANUAL}
        self.assertTrue(is_manual_product_section(manual))
        self.assertTrue(is_assignable_product_section(document, manual))

    def test_a_section_saved_before_the_contract_still_reads_as_manual(self):
        # No source, no selection mode: the legacy spelling of a curated section.
        legacy = {"id": "sec_legacy", "type": "product_carousel"}
        self.assertEqual(source_of(legacy), "assigned")
        self.assertEqual(selection_mode_of(legacy), SELECTION_MANUAL)

    def test_normalising_a_flash_sale_writes_the_campaign_defaults(self):
        normalised = normalize_section({"id": "sec_flash", "type": "product_carousel",
                                        "name": "Weekend offer", "presentation": "flash_sale"})
        self.assertEqual(normalised["selectionMode"], SELECTION_MANUAL)
        self.assertEqual(normalised["source"], "assigned")
        for key, value in FLASH_SALE_DEFAULTS.items():
            self.assertEqual(normalised.get(key), value, key)

    def test_custom_manual_section_terms_survive_seller_review_and_approval(self):
        page = self.client.get("/admin/cms/page", headers={"X-Ferix-Session": self.admin},
                               params={"id": "doc_marketplace_home"}).json()["page"]
        sections = list(page["sections"])
        sections.append({
            "id": "sec_custom_offer", "type": "product_carousel", "name": "Weekend offer",
            "source": "assigned", "selectionMode": "manual", "presentation": "flash_sale",
            "position": len(sections) + 1, "visible": True,
        })
        saved = self.client.patch("/admin/cms/page", headers={"X-Ferix-Session": self.admin},
                                  json={"id": "doc_marketplace_home", "sections": sections})
        self.assertEqual(saved.status_code, 200, saved.text)

        merchant_login = self.client.post("/merchant/login", json={
            "email": "owner@aurasound.ferixas.com", "password": "TestOnly-Password-123!",
        })
        self.assertEqual(merchant_login.status_code, 200, merchant_login.text)
        merchant = merchant_login.json()["token"]
        options = self.client.get("/merchant/product/options", headers={"X-Ferix-Session": merchant})
        self.assertEqual(options.status_code, 200, options.text)
        section_value = "doc_marketplace_home__sec_custom_offer"
        product = self.client.post("/merchant/product", headers={"X-Ferix-Session": merchant}, json={
            "title": "Custom section terms test item",
            "category": options.json()["categories"][0]["slug"],
            "price": 120, "compareAt": 130, "stock": 9, "marketplace": True,
            "section_tags": [section_value],
            "section_terms": {section_value: {
                "price": 75, "compareAt": 120, "label": "Weekend price",
                "startsAt": "2026-10-15T10:00", "endsAt": "2026-10-20T18:00",
            }},
        })
        self.assertEqual(product.status_code, 200, product.text)
        submitted = product.json()["product"]
        self.assertEqual(submitted["placementTerms"][section_value]["price"], 75)

        approved = self.client.post("/admin/review/decision", headers={"X-Ferix-Session": self.admin}, json={
            "id": submitted["id"], "decision": "approve",
        })
        self.assertEqual(approved.status_code, 200, approved.text)
        with SessionLocal() as db:
            placement = db.query(SectionPlacement).filter_by(
                product_id=submitted["id"], document_id="doc_marketplace_home", section_id="sec_custom_offer",
            ).one()
            self.assertEqual(placement.price, 75)
            self.assertEqual(placement.compare_at, 120)
            self.assertEqual(placement.config.get("label"), "Weekend price")
            self.assertIsNotNone(placement.starts_at)
            self.assertIsNotNone(placement.ends_at)

    def test_a_broken_section_is_rejected_before_it_is_stored(self):
        with self.assertRaises(ValueError):
            validate_section({"id": "sec_bad", "type": "product_carousel", "source": "not_a_source"})
        with self.assertRaises(ValueError):
            validate_section({"id": "sec_bad", "type": "product_carousel", "presentation": "not_a_presentation"})
        with self.assertRaises(ValueError):
            validate_section({"id": "sec_bad", "type": "product_carousel",
                              "startsAt": "2026-13-45T99:99", "endsAt": ""})

    def test_a_closed_campaign_is_not_live(self):
        live = {"id": "sec_a", "type": "product_carousel", "visible": True,
                "startsAt": "2020-01-01T00:00:00+00:00", "endsAt": "2099-01-01T00:00:00+00:00"}
        finished = {"id": "sec_b", "type": "product_carousel", "visible": True,
                    "startsAt": "2020-01-01T00:00:00+00:00", "endsAt": "2020-02-01T00:00:00+00:00"}
        upcoming = {"id": "sec_c", "type": "product_carousel", "visible": True,
                    "startsAt": "2099-01-01T00:00:00+00:00", "endsAt": "2099-02-01T00:00:00+00:00"}
        self.assertTrue(section_is_live(live))
        self.assertFalse(section_is_live(finished))
        self.assertFalse(section_is_live(upcoming))

    def test_the_console_can_read_the_whole_contract(self):
        response = self.client.get("/admin/cms/section-types", headers={"X-Ferix-Session": self.admin})
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(len(body["palette"]), len(PALETTE))
        self.assertEqual(sorted(body["allSources"]), sorted(ALL_SOURCES))
        self.assertEqual(sorted(body["legacySources"]), sorted(LEGACY_SOURCES))
        self.assertEqual(sorted(body["presentations"]), sorted(PRESENTATIONS))
        # Every automatic source explains itself and says what it can be set up with.
        for source in body["automaticSources"]:
            self.assertTrue(source["label"], source)
            self.assertTrue(source["hint"], source)
            self.assertIsInstance(source["config"], list)

    def test_saving_a_page_keeps_the_contract_on_every_section(self):
        page = self.client.get("/admin/cms/page", headers={"X-Ferix-Session": self.admin},
                               params={"id": "doc_marketplace_home"})
        self.assertEqual(page.status_code, 200, page.text)
        sections = page.json()["page"]["sections"]
        self.assertTrue(sections)
        sections.append({"id": "sec_contract", "type": "product_carousel", "name": "Flash sale",
                         "presentation": "flash_sale", "position": len(sections) + 1, "visible": True})
        saved = self.client.patch("/admin/cms/page", headers={"X-Ferix-Session": self.admin},
                                  json={"id": "doc_marketplace_home", "sections": sections})
        self.assertEqual(saved.status_code, 200, saved.text)
        stored = saved.json()["page"]["sections"]
        added = next(section for section in stored if section.get("id") == "sec_contract")
        self.assertEqual(added["selectionMode"], SELECTION_MANUAL)
        self.assertEqual(added["presentation"], "flash_sale")
        for key, value in FLASH_SALE_DEFAULTS.items():
            self.assertEqual(added.get(key), value, key)

    def test_a_page_cannot_be_saved_with_an_unknown_source(self):
        page = self.client.get("/admin/cms/page", headers={"X-Ferix-Session": self.admin},
                               params={"id": "doc_marketplace_home"}).json()["page"]
        sections = page["sections"]
        sections.append({"id": "sec_bad", "type": "product_carousel", "name": "Broken",
                         "source": "definitely_not_a_source", "position": len(sections) + 1,
                         "visible": True})
        rejected = self.client.patch("/admin/cms/page", headers={"X-Ferix-Session": self.admin},
                                     json={"id": "doc_marketplace_home", "sections": sections})
        self.assertEqual(rejected.status_code, 422, rejected.text)


if __name__ == "__main__":
    unittest.main()
