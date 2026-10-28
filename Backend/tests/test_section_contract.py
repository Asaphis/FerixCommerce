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
from core import ContentDocument, SectionPlacement, SessionLocal, find_product, is_assignable_product_section  # noqa: E402
from cms_sections import (ALL_SOURCES, AUTOMATIC_SOURCES, FLASH_SALE_DEFAULTS, LEGACY_SOURCES,
                          PALETTE, PRESENTATIONS, REQUIREMENT_LIBRARY, REQUIREMENT_SETS,
                          SELECTION_AUTOMATIC, SELECTION_MANUAL, SECTION_FIELDS,
                          apply_placement_overrides, card_display_defaults, feed_rule, is_manual_product_section,
                          normalize_section, palette_for, placement_is_live, product_config_schema,
                          requirement_fields, section_fields, section_is_live, section_requirements,
                          is_safe_css_color, selection_mode_of, selector_of, source_of, validate_section)  # noqa: E402
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

    def test_section_normalization_coerces_legacy_visibility_and_hero_choices(self):
        hidden = normalize_section({"type": "hero_banner", "visible": "false", "align": "sideways", "vertical": "centre", "tone": "unknown"})
        self.assertIs(hidden["visible"], False)
        self.assertEqual(hidden["align"], "left")
        self.assertEqual(hidden["vertical"], "middle")
        self.assertEqual(hidden["tone"], "dark")
        visible = normalize_section({"type": "hero_banner", "visible": "yes", "align": "CENTER"})
        self.assertIs(visible["visible"], True)
        self.assertEqual(visible["align"], "center")

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

        from datetime import datetime, timezone
        starts = datetime(2026, 10, 1, 12, tzinfo=timezone.utc)
        ends = datetime(2026, 10, 5, 12, tzinfo=timezone.utc)
        timed = SimpleNamespace(price=0, compare_at=0, quantity=0, section_id="sec_offer",
                                config={}, starts_at=starts, ends_at=ends)
        timed_card = apply_placement_overrides(base, timed)
        self.assertEqual(timed_card["placementStartsAt"], starts.isoformat())
        self.assertEqual(timed_card["placementEndsAt"], ends.isoformat())

        untimed = SimpleNamespace(price=0, compare_at=0, quantity=0, section_id="sec_offer", config={})
        untimed_card = apply_placement_overrides(base, untimed)
        self.assertNotIn("placementStartsAt", untimed_card)
        self.assertNotIn("placementEndsAt", untimed_card)

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

        rejected_color = self.client.post("/merchant/product", headers={"X-Ferix-Session": merchant}, json={
            "title": "Invalid badge color test product", "category": options.json()["categories"][0]["slug"],
            "price": 25, "stock": 3, "marketplace": True, "section_tags": [section_value],
            "section_terms": {section_value: {"price": 20, "label": "Bad color", "badgeColor": "red;display:none"}},
        })
        self.assertEqual(rejected_color.status_code, 422, rejected_color.text)

    def test_a_broken_section_is_rejected_before_it_is_stored(self):
        with self.assertRaises(ValueError):
            validate_section({"id": "sec_bad", "type": "product_carousel", "source": "not_a_source"})
        with self.assertRaises(ValueError):
            validate_section({"id": "sec_bad", "type": "product_carousel", "presentation": "not_a_presentation"})
        with self.assertRaises(ValueError):
            validate_section({"id": "sec_bad", "type": "product_carousel",
                              "startsAt": "2026-13-45T99:99", "endsAt": ""})
        with self.assertRaises(ValueError):
            validate_section({"id": "sec_bad", "type": "product_carousel", "backgroundColor": "red;display:none"})
        with self.assertRaises(ValueError):
            validate_section({"id": "sec_bad", "type": "product_carousel", "accentColor": "linear-gradient(90deg, red, blue)"})
        with self.assertRaises(ValueError):
            validate_section({"id": "sec_bad", "type": "product_carousel", "backgroundColor": "linear-gradient(90deg, red, url(javascript:alert(1)))"})
        with self.assertRaises(ValueError):
            validate_section({"id": "sec_bad", "type": "product_carousel", "ctaHref": "javascript:alert(1)"})
        validate_section({"id": "sec_good", "type": "product_carousel", "backgroundColor": "#12aBef"})
        validate_section({"id": "sec_good", "type": "product_carousel", "backgroundColor": "linear-gradient(135deg, #e4572e 0%, rgb(18, 38, 58) 100%)"})
        validate_section({"id": "sec_good", "type": "product_carousel", "textColor": "hsl(210, 40%, 20%)"})
        self.assertTrue(is_safe_css_color("#abc"))
        self.assertFalse(is_safe_css_color("linear-gradient(90deg, red, blue)"))
        validate_section({"id": "sec_good", "type": "product_carousel", "ctaHref": "https://ferixas.com/browse"})

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

    def test_section_preview_resolves_automatic_source_from_draft_configuration(self):
        page = self.client.get("/admin/cms/page", headers={"X-Ferix-Session": self.admin},
                               params={"id": "doc_marketplace_home"}).json()["page"]
        sections = list(page["sections"])
        target = next((row for row in sections if row.get("type") == "product_carousel"), None)
        self.assertIsNotNone(target)
        target.update({"source": "category", "selectionMode": "automatic", "categorySlug": "electronics", "limit": 3})
        saved = self.client.patch("/admin/cms/page", headers={"X-Ferix-Session": self.admin},
                                  json={"id": "doc_marketplace_home", "sections": sections})
        self.assertEqual(saved.status_code, 200, saved.text)
        preview = self.client.get("/admin/cms/page/section-preview", headers={"X-Ferix-Session": self.admin},
                                  params={"id": "doc_marketplace_home", "section_id": target["id"]})
        self.assertEqual(preview.status_code, 200, preview.text)
        self.assertLessEqual(len(preview.json()["products"]), 3)
        self.assertTrue(all("id" in item and "stockStatus" in item for item in preview.json()["products"]))

    def test_placement_update_clears_null_dates_empty_config_and_persists_pause(self):
        with SessionLocal() as db:
            page = db.get(ContentDocument, "doc_marketplace_home")
            section = next(row for row in page.data["sections"] if row.get("type") == "product_carousel")
            product = find_product(db, "aurasound-pro-anc-headphones")
            product_id, document_id, section_id = product["id"], page.id, section["id"]
            row = SectionPlacement(id="plc_preview_regression", product_id=product_id,
                                   product_slug=product["slug"], document_id=document_id,
                                   section_id=section_id, section_type=section["type"],
                                   price=product["price"], compare_at=product.get("compareAt") or 0,
                                   quantity=1, position=1, starts_at=None, ends_at=None,
                                   config={"label": "existing"}, active=True)
            db.add(row)
            db.commit()
        response = self.client.post("/admin/product/section", headers={"X-Ferix-Session": self.admin}, json={
            "productId": product_id, "documentId": document_id, "sectionId": section_id,
            "startsAt": None, "endsAt": None, "config": {}, "active": False,
        })
        self.assertEqual(response.status_code, 200, response.text)
        self.assertFalse(response.json()["placement"]["active"])
        self.assertEqual(response.json()["placement"]["config"], {})
        with SessionLocal() as db:
            row = db.query(SectionPlacement).filter_by(product_id=product_id, document_id=document_id, section_id=section_id).one()
            self.assertIsNone(row.starts_at)
            self.assertIsNone(row.ends_at)
            self.assertFalse(row.active)

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

    def test_section_palette_is_filtered_to_the_page_family(self):
        headers = {"X-Ferix-Session": self.admin}
        home = self.client.get("/admin/cms/section-types", headers=headers,
                               params={"document_type": "marketplace_home"})
        product = self.client.get("/admin/cms/section-types", headers=headers,
                                  params={"document_type": "marketplace_product"})
        self.assertEqual(home.status_code, 200, home.text)
        self.assertEqual(product.status_code, 200, product.text)
        home_types = {entry["type"] for group in home.json()["palette"] for entry in group["entries"]}
        product_types = {entry["type"] for group in product.json()["palette"] for entry in group["entries"]}
        self.assertNotIn("product_gallery", home_types)
        self.assertIn("product_gallery", product_types)
        self.assertNotIn("category_grid", product_types)

    def test_product_page_palette_and_save_match_rendered_template(self):
        headers = {"X-Ferix-Session": self.admin}
        palette = self.client.get("/admin/cms/section-types", headers=headers,
                                  params={"document_type": "marketplace_product"}).json()["palette"]
        offered = {entry["type"] for group in palette for entry in group["entries"]}
        self.assertEqual(offered, {"product_gallery", "buy_box", "delivery_block", "reviews"})

        page = self.client.get("/admin/cms/page", headers=headers,
                               params={"id": "doc_marketplace_product"}).json()["page"]
        # The seeded related rail is retained as a legacy product-specific block.
        self.assertTrue(any(row.get("type") == "product_carousel" and row.get("source") == "related"
                            for row in page["sections"]))
        rejected_sections = list(page["sections"]) + [{
            "id": "sec_unrendered_product_hero", "type": "hero_banner", "position": 99, "visible": True,
        }]
        rejected = self.client.patch("/admin/cms/page", headers=headers,
                                     json={"id": "doc_marketplace_product", "sections": rejected_sections})
        self.assertEqual(rejected.status_code, 422, rejected.text)

    def test_section_price_reaches_cart_and_is_validated_server_side(self):
        document_id, section_id = "doc_marketplace_home", "sec_flash"
        with SessionLocal() as db:
            product = find_product(db, "aurasound-pro-anc-headphones")
            self.assertIsNotNone(product)
            db.add(SectionPlacement(
                id="plc_cart_contract", product_id=product["id"], product_slug=product["slug"],
                document_id=document_id, section_id=section_id, section_type="product_carousel",
                price=41.0, compare_at=69.0, quantity=2, position=1,
                config={"label": "Weekend price", "badgeColor": "#123456"},
            ))
            base_price = product["price"]
            db.commit()

        public = self.client.get("/catalog/home")
        self.assertEqual(public.status_code, 200, public.text)
        section_product = public.json()["placements"][section_id][0]
        self.assertEqual(section_product["price"], 41.0)
        self.assertEqual(section_product["sectionDocumentId"], document_id)
        self.assertEqual(section_product["sectionId"], section_id)
        detail = self.client.get("/catalog/product", params={
            "slug": product["slug"], "document_id": document_id, "section_id": section_id,
        })
        self.assertEqual(detail.status_code, 200, detail.text)
        self.assertEqual(detail.json()["product"]["price"], 41.0)
        self.assertEqual(detail.json()["product"]["sectionId"], section_id)
        ordinary_detail = self.client.get("/catalog/product", params={"slug": product["slug"]})
        self.assertEqual(ordinary_detail.status_code, 200, ordinary_detail.text)
        effective_base_price = ordinary_detail.json()["product"]["price"]

        shopper = self.client.post("/auth/register", json={
            "name": "Section Cart Shopper", "email": "section-cart@example.com",
            "password": "Shopper-Test-Password-123!",
        })
        self.assertEqual(shopper.status_code, 200, shopper.text)
        headers = {"X-Ferix-Session": shopper.json()["token"]}
        scoped_body = {"productId": product["id"], "qty": 1, "documentId": document_id,
                       "sectionId": section_id, "expectedPrice": 41.0}

        added = self.client.post("/cart/items", headers=headers, json=scoped_body)
        self.assertEqual(added.status_code, 200, added.text)
        cart = added.json()
        self.assertEqual(len(cart["lines"]), 1)
        self.assertEqual(cart["lines"][0]["unitPrice"], 41.0)
        self.assertEqual(cart["lines"][0]["lineTotal"], 41.0)
        self.assertEqual(cart["lines"][0]["sectionLabel"], "Weekend price")
        scoped_key = cart["lines"][0]["key"]

        stale_price = self.client.post("/cart/items", headers=headers,
                                       json={**scoped_body, "expectedPrice": base_price})
        self.assertEqual(stale_price.status_code, 409, stale_price.text)

        # Same product outside the section remains a separate, base-price line.
        ordinary = self.client.post("/cart/items", headers=headers,
                                    json={"productId": product["id"], "qty": 1})
        self.assertEqual(ordinary.status_code, 200, ordinary.text)
        lines = ordinary.json()["lines"]
        self.assertEqual(len(lines), 2)
        self.assertEqual(next(line for line in lines if line["key"] == scoped_key)["unitPrice"], 41.0)
        self.assertEqual(next(line for line in lines if line["key"] != scoped_key)["unitPrice"], effective_base_price)

        too_many = self.client.post("/cart/items", headers=headers, json={**scoped_body, "qty": 2})
        self.assertEqual(too_many.status_code, 409, too_many.text)
        qty_update = self.client.patch("/cart/items", headers=headers,
                                       json={"key": scoped_key, "qty": 3})
        self.assertEqual(qty_update.status_code, 409, qty_update.text)
        forged = self.client.post("/cart/items", headers=headers,
                                  json={**scoped_body, "sectionId": "sec_not_real"})
        self.assertEqual(forged.status_code, 409, forged.text)

        with SessionLocal() as db:
            document = db.get(ContentDocument, document_id)
            data = dict(document.data or {})
            data["sections"] = [
                {**section, "showSectionPrice": False} if section.get("id") == section_id else section
                for section in data.get("sections", [])
            ]
            document.data = data
            db.commit()
        updated_cart = self.client.get("/cart", headers=headers)
        self.assertEqual(updated_cart.status_code, 200, updated_cart.text)
        scoped_line = next(line for line in updated_cart.json()["lines"] if line.get("sectionId") == section_id)
        self.assertEqual(scoped_line["unitPrice"], effective_base_price)

    def test_section_preview_reads_live_saved_content_and_real_placements(self):
        headers = {"X-Ferix-Session": self.admin}
        document_id, section_id = "doc_marketplace_home", "sec_flash"
        with SessionLocal() as db:
            base = find_product(db, "aurasound-pro-anc-headphones")
            self.assertIsNotNone(base)
            db.add(SectionPlacement(
                id="plc_preview_contract", product_id=base["id"], product_slug=base["slug"],
                document_id=document_id, section_id=section_id, section_type="product_carousel",
                price=41.0, compare_at=69.0, quantity=3, position=1,
                config={"label": "Preview label", "badgeColor": "#123456"},
            ))
            db.commit()

        original = self.client.get("/catalog/home")
        self.assertEqual(original.status_code, 200, original.text)
        original_title = next(section["title"] for section in original.json()["content"]["sections"]
                              if section["id"] == section_id)
        page = self.client.get("/admin/cms/page", headers=headers, params={"id": document_id}).json()["page"]
        sections = [
            {**section, "title": "A draft title, not public yet"} if section["id"] == section_id else section
            for section in page["sections"]
        ]
        saved = self.client.patch("/admin/cms/page", headers=headers,
                                  json={"id": document_id, "sections": sections})
        self.assertEqual(saved.status_code, 200, saved.text)

        # The public API immediately serves the saved page, while the preview
        # still includes its real assigned product.
        public_after_save = self.client.get("/catalog/home").json()
        public_title = next(section["title"] for section in public_after_save["content"]["sections"]
                            if section["id"] == section_id)
        self.assertEqual(public_title, "A draft title, not public yet")
        no_auth = self.client.get("/admin/cms/page/section-preview",
                                  params={"id": document_id, "section_id": section_id})
        self.assertEqual(no_auth.status_code, 401)
        preview = self.client.get("/admin/cms/page/section-preview", headers=headers,
                                  params={"id": document_id, "section_id": section_id})
        self.assertEqual(preview.status_code, 200, preview.text)
        body = preview.json()
        self.assertEqual(body["section"]["title"], "A draft title, not public yet")
        self.assertEqual(body["assignedCount"], 1)
        product = body["products"][0]
        self.assertEqual(product["title"], "AuraSound Pro ANC Headphones")
        self.assertEqual(product["price"], 41.0)
        self.assertEqual(product["sectionLabel"], "Preview label")
        self.assertEqual(product["previewStatus"], "Live")
        for private_key in ("sku", "cost", "reservedStock", "sellerEmail"):
            self.assertNotIn(private_key, product)

        live = self.client.get("/catalog/home").json()
        live_section = next(section for section in live["content"]["sections"] if section["id"] == section_id)
        self.assertEqual(live_section["title"], "A draft title, not public yet")
        self.assertEqual(live["placements"][section_id][0]["title"], "AuraSound Pro ANC Headphones")

    def test_page_save_rejects_a_family_the_public_page_does_not_render(self):
        headers = {"X-Ferix-Session": self.admin}
        page = self.client.get("/admin/cms/page", headers=headers,
                               params={"id": "doc_marketplace_home"}).json()["page"]
        sections = list(page["sections"]) + [{
            "id": "sec_invalid_product_template", "type": "product_gallery", "position": 99, "visible": True,
        }]
        rejected = self.client.patch("/admin/cms/page", headers=headers,
                                     json={"id": "doc_marketplace_home", "sections": sections})
        self.assertEqual(rejected.status_code, 422, rejected.text)


if __name__ == "__main__":
    unittest.main()


class SectionDeclarationTest(unittest.TestCase):
    """What a section asks of a product, and how each feed ranks."""

    def plain(self, **extra):
        row = {"id": "sec_plain", "type": "product_carousel", "source": "assigned"}
        row.update(extra)
        return row

    def campaign(self, **extra):
        row = self.plain(presentation="flash_sale")
        row.update(extra)
        return row

    def feed(self, source, **extra):
        row = {"id": f"sec_{source}", "type": "product_carousel", "source": source}
        row.update(extra)
        return row

    # ── the declaration ───────────────────────────────────────────────────
    def test_a_plain_row_asks_for_nothing_but_its_own_order(self):
        self.assertEqual(section_requirements(self.plain()), list(REQUIREMENT_SETS["simple"]))

    def test_a_campaign_dressing_asks_for_a_price_and_a_label(self):
        asked = section_requirements(self.campaign())
        for key in ("price", "compareAt", "label", "startsAt", "endsAt"):
            self.assertIn(key, asked)

    def test_the_dressing_only_ever_adds_to_what_a_section_asks(self):
        # The fault this replaces: a section created as a plain row could never
        # ask for a price afterwards, because its field list was frozen.
        before, after = self.plain(), self.plain(presentation="flash_sale")
        self.assertLess(set(section_requirements(before)), set(section_requirements(after)))

    def test_a_plain_row_can_be_given_a_price_deliberately(self):
        row = normalize_section(self.plain(productRequirements=["price", "label"],
                                           requirementsPreset="custom"))
        keys = [item["key"] for item in row["productConfigSchema"]]
        self.assertIn("price", keys)
        self.assertIn("label", keys)

    def test_a_sections_own_list_is_honoured_exactly(self):
        row = normalize_section(self.plain(productRequirements=["quantity"], requirementsPreset="custom"))
        self.assertEqual(row["productRequirements"], ["quantity"])
        self.assertEqual([item["key"] for item in row["productConfigSchema"]], ["quantity"])

    def test_saving_a_section_never_freezes_the_field_list(self):
        first = normalize_section(self.plain())
        second = normalize_section(dict(first))
        self.assertEqual(section_requirements(first), section_requirements(second))
        third = normalize_section(dict(second, presentation="flash_sale", requirementsPreset="campaign"))
        self.assertIn("price", section_requirements(third))

    def test_an_older_section_keeps_what_it_already_asked_for(self):
        legacy = self.plain(presentation="flash_sale",
                            productConfigSchema=[{"key": "price"}, {"key": "label"}, {"key": "badgeColor"}])
        for key in ("price", "label", "badgeColor"):
            self.assertIn(key, section_requirements(legacy))

    def test_the_product_form_reads_the_sections_own_list(self):
        row = normalize_section(self.plain(productRequirements=["price"], requirementsPreset="custom"))
        self.assertEqual([item["key"] for item in product_config_schema(row)], ["price"])

    def test_an_unknown_requirement_is_refused(self):
        with self.assertRaises(ValueError):
            validate_section({"id": "s", "type": "product_carousel", "source": "assigned",
                              "productRequirements": ["free_tv"]})

    def test_a_section_cannot_end_before_it_starts(self):
        with self.assertRaises(ValueError):
            validate_section({"id": "s", "type": "hero_banner",
                              "startsAt": "2026-11-30T10:00", "endsAt": "2026-11-01T10:00"})
        validate_section({"id": "s", "type": "hero_banner",
                          "startsAt": "2026-11-01T10:00", "endsAt": "2026-11-30T10:00"})

    def test_every_field_a_section_shows_is_typed(self):
        for section_type, fields in SECTION_FIELDS.items():
            for item in fields:
                self.assertIn(item["kind"], {"text", "number", "datetime", "color", "choice", "toggle"},
                              f"{section_type}.{item['key']}")
                self.assertTrue(item.get("label"), f"{section_type}.{item['key']}")
        self.assertTrue([i for i in section_fields(self.campaign()) if i["kind"] == "color"],
                        "a campaign must offer colour pickers, not hex text boxes")
        self.assertTrue([i for i in section_fields({"type": "hero_banner"}) if i["kind"] == "datetime"],
                        "every family can carry the section clock")

    def test_a_card_has_display_switches_of_its_own(self):
        shown = card_display_defaults(self.campaign())
        for key in ("showSectionPrice", "showCompareAt", "showLabel", "showCountdown"):
            self.assertIn(key, shown)

    # ── the feeds ─────────────────────────────────────────────────────────
    def test_every_feed_declares_a_ranking_rule(self):
        for source, entry in AUTOMATIC_SOURCES.items():
            self.assertIn("rank", entry, source)
            self.assertTrue(entry["rank"].get("primary"), source)

    def test_trending_and_best_sellers_rank_differently(self):
        trending, best = feed_rule(self.feed("trending")), feed_rule(self.feed("best_sellers"))
        self.assertNotEqual(trending, best)
        self.assertEqual(trending["window"], 7)
        self.assertEqual(best["window"], 0)

    def test_an_operator_can_overrule_a_feeds_own_window(self):
        rule = feed_rule(self.feed("trending", windowDays=14, minimumSales=3))
        self.assertEqual((rule["window"], rule["minimum"]), (14, 3))

    def test_the_two_sales_feeds_return_different_orders(self):
        from app import resolve_cms_product_source
        products = [{"id": "a", "price": 10, "compareAt": 0, "category": "home", "collections": [],
                     "createdAt": "2026-10-13T09:00:00+00:00"},
                    {"id": "b", "price": 10, "compareAt": 0, "category": "home", "collections": [],
                     "createdAt": "2026-10-01T09:00:00+00:00"}]
        public = {item["id"]: dict(item) for item in products}
        units_by_window = {0: {"a": 10, "b": 100}, 7: {"a": 30, "b": 1}}
        trending = resolve_cms_product_source(self.feed("trending"), products, public, units_by_window[7], None, units_by_window)
        best = resolve_cms_product_source(self.feed("best_sellers"), products, public, units_by_window[0], None, units_by_window)
        self.assertEqual([i["id"] for i in trending], ["a", "b"])
        self.assertEqual([i["id"] for i in best], ["b", "a"])

    def test_a_department_feed_reads_the_record_it_names(self):
        section = self.feed("category", categorySlug="home")
        self.assertEqual(selector_of(section), "home")
        from app import resolve_cms_product_source
        products = [{"id": "a", "price": 5, "compareAt": 0, "category": "home", "collections": [],
                     "createdAt": "2026-10-01T09:00:00+00:00"},
                    {"id": "b", "price": 5, "compareAt": 0, "category": "garden", "collections": [],
                     "createdAt": "2026-10-02T09:00:00+00:00"}]
        public = {item["id"]: dict(item) for item in products}
        self.assertEqual([i["id"] for i in resolve_cms_product_source(section, products, public, {}, None, {})], ["a"])
        self.assertEqual(resolve_cms_product_source(self.feed("category", categorySlug="autmn-decor"),
                                                   products, public, {}, None, {}), [])

    def test_related_is_not_offered_as_a_feed_to_attach_to(self):
        from app import resolve_cms_product_source
        self.assertEqual(resolve_cms_product_source(self.feed("related"), [], {}, {}, None, {}), [])

    # ── placement state ───────────────────────────────────────────────────
    def test_a_product_switched_off_in_a_section_is_not_live(self):
        self.assertTrue(placement_is_live(SimpleNamespace(active=True, starts_at=None, ends_at=None)))
        self.assertFalse(placement_is_live(SimpleNamespace(active=False, starts_at=None, ends_at=None)))

    def test_a_placement_with_no_state_recorded_still_reads_as_live(self):
        self.assertTrue(placement_is_live(SimpleNamespace(starts_at=None, ends_at=None)))

    # ── the palette follows the page ──────────────────────────────────────
    def test_product_page_blocks_are_only_offered_on_the_product_page(self):
        self.assertNotIn("product_template", [g["id"] for g in palette_for("marketplace_home")])
        self.assertIn("product_template", [g["id"] for g in palette_for("marketplace_product")])

    def test_every_requirement_has_a_home_in_the_library(self):
        for preset, keys in REQUIREMENT_SETS.items():
            for key in keys:
                self.assertIn(key, REQUIREMENT_LIBRARY, preset)
        self.assertEqual([item["key"] for item in requirement_fields(["price", "nope"])], ["price"])
