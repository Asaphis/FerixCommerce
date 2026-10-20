"""/catalog/home must explain why a stored section is not served."""
from __future__ import annotations

import unittest
from datetime import timedelta

from fastapi.testclient import TestClient

from app import app
from core import ContentDocument, SectionPlacement, SessionLocal, new_id, now

BASE = {"type": "product_carousel", "selectionMode": "manual", "source": "assigned",
        "presentation": "standard", "visible": True}


def section(section_id, **extra):
    row = dict(BASE, id=section_id, name=section_id, position=1)
    row.update(extra)
    return row


class SectionsDiagnosticsTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        with SessionLocal() as db:
            previous = db.get(ContentDocument, "doc_marketplace_home")
            self.previous_data = dict(previous.data or {}) if previous else None
            self.previous_status = previous.status if previous else None
            if previous is None:
                db.add(ContentDocument(id="doc_marketplace_home", owner_type="platform",
                                       owner_id="platform", document_type="marketplace_home",
                                       title="Homepage", status="published", data={"sections": []}))
                db.commit()
            document = db.get(ContentDocument, "doc_marketplace_home")
            document.status = "published"
            document.data = {"sections": [
                section("sec_live", position=1),
                section("sec_hidden", position=2, visible=False),
                section("sec_window", position=3,
                        startsAt="2020-01-01T00:00:00+00:00", endsAt="2020-02-01T00:00:00+00:00"),
            ]}
            db.query(SectionPlacement).filter(
                SectionPlacement.document_id == "doc_marketplace_home").delete()
            db.add(SectionPlacement(id=new_id("plc"), product_id="prd_live", product_slug="prd-live",
                                    document_id="doc_marketplace_home", section_id="sec_live",
                                    section_type="product_carousel"))
            db.add(SectionPlacement(id=new_id("plc"), product_id="prd_gone", product_slug="prd-gone",
                                    document_id="doc_marketplace_home", section_id="sec_live",
                                    section_type="product_carousel",
                                    starts_at=now() - timedelta(days=5),
                                    ends_at=now() - timedelta(days=2)))
            db.commit()

    def tearDown(self):
        with SessionLocal() as db:
            document = db.get(ContentDocument, "doc_marketplace_home")
            if document is None:
                return
            if self.previous_data is None:
                db.delete(document)
            else:
                document.data = self.previous_data
                document.status = self.previous_status
            db.commit()

    def test_the_diagnostics_name_the_gate_for_every_section(self):
        body = self.client.get("/catalog/home").json()
        diagnostics = body["sectionsDiagnostics"]
        by_id = {row["id"]: row for row in diagnostics["sections"]}

        self.assertEqual(by_id["sec_live"]["gate"], "live")
        self.assertTrue(by_id["sec_live"]["onPage"])
        self.assertEqual(by_id["sec_live"]["placements"], 2)
        self.assertEqual(by_id["sec_live"]["livePlacements"], 1)

        self.assertEqual(by_id["sec_hidden"]["gate"], "hidden")
        self.assertFalse(by_id["sec_hidden"]["onPage"])

        self.assertEqual(by_id["sec_window"]["gate"], "window")
        self.assertFalse(by_id["sec_window"]["onPage"])

        self.assertEqual([row["id"] for row in body["content"]["sections"]], ["sec_live"])
        self.assertEqual(diagnostics["page"]["sectionsStored"], 3)
        self.assertEqual(diagnostics["page"]["sectionsServed"], 1)

    def test_diagnostics_never_claim_empty_when_placements_exist(self):
        body = self.client.get("/catalog/home").json()
        entry = body["manualDiagnostics"].get("sec_live")
        self.assertIsNotNone(entry, "a manual section with rows must be explained")
        self.assertEqual(entry["placed"], 2)
        self.assertIn("placed in this section", entry["reason"])
