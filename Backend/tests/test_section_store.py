"""The section index: documents stay the artefact, sections become rows."""
from __future__ import annotations

import unittest
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import select

from app import app
from core import (Base, ContentDocument, ContentVersion, Section, SectionPlacement,
                  SessionLocal, engine, new_id, orphan_placements, sync_document_sections)


def _section(section_id, section_type="product_carousel", **extra):
    row = {"id": section_id, "type": section_type, "name": f"Section {section_id}",
           "position": 1, "visible": True, "selectionMode": "none", "presentation": "standard"}
    row.update(extra)
    return row


class SectionStoreTest(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(engine)
        self.document_id = f"doc_test_{uuid.uuid4().hex[:10]}"

    def _document(self, sections, draft_sections=None):
        with SessionLocal() as db:
            db.add(ContentDocument(id=self.document_id, owner_type="platform",
                                   owner_id="platform", document_type="marketplace_home",
                                   title="Test page", status="published",
                                   data={"sections": sections}))
            if draft_sections is not None:
                db.add(ContentVersion(id=new_id("cv"), document_id=self.document_id, version=2,
                                      status="draft", data={"sections": draft_sections}))
            db.commit()

    def _place(self, section_id, product_id="prd_test"):
        with SessionLocal() as db:
            db.add(SectionPlacement(id=new_id("plc"), product_id=product_id,
                                    product_slug=product_id, document_id=self.document_id,
                                    section_id=section_id, section_type="product_carousel"))
            db.commit()

    def _rows(self, status=None):
        with SessionLocal() as db:
            rows = db.scalars(select(Section)).all()
        return [row for row in rows if row.document_id == self.document_id
                and (status is None or row.status == status)]

    def test_published_and_draft_sections_both_become_rows(self):
        self._document([_section("sec_a", title="Deals")],
                       draft_sections=[_section("sec_a", title="New deals"),
                                       _section("sec_b", title="Only in draft")])
        with SessionLocal() as db:
            result = sync_document_sections(db, db.get(ContentDocument, self.document_id))
            db.commit()
        self.assertEqual(result["written"], 3)
        self.assertEqual([row.section_id for row in self._rows("published")], ["sec_a"])
        self.assertEqual(sorted(row.section_id for row in self._rows("draft")), ["sec_a", "sec_b"])
        draft = {row.section_id: row for row in self._rows("draft")}
        self.assertEqual(draft["sec_a"].settings.get("title"), "New deals")
        self.assertEqual(draft["sec_a"].type, "product_carousel")

    def test_a_placement_into_a_missing_section_is_reported(self):
        self._document([_section("sec_a")])
        with SessionLocal() as db:
            sync_document_sections(db, db.get(ContentDocument, self.document_id))
            db.commit()
        self._place("sec_a")
        self._place("sec_missing")
        with SessionLocal() as db:
            orphans = [row for row in orphan_placements(db) if row["documentId"] == self.document_id]
        self.assertEqual([row["sectionId"] for row in orphans], ["sec_missing"])

    def test_removing_a_section_removes_its_row(self):
        self._document([_section("sec_a"), _section("sec_b")])
        with SessionLocal() as db:
            sync_document_sections(db, db.get(ContentDocument, self.document_id))
            db.commit()
        with SessionLocal() as db:
            document = db.get(ContentDocument, self.document_id)
            document.data = {"sections": [_section("sec_b")]}
            db.flush()
            sync_document_sections(db, document)
            db.commit()
        self.assertEqual([row.section_id for row in self._rows("published")], ["sec_b"])

    def test_sync_is_idempotent(self):
        self._document([_section("sec_a"), _section("sec_b")])
        with SessionLocal() as db:
            sync_document_sections(db, db.get(ContentDocument, self.document_id))
            db.commit()
        with SessionLocal() as db:
            second = sync_document_sections(db, db.get(ContentDocument, self.document_id))
            db.commit()
        self.assertEqual(second["removed"], 0)
        self.assertEqual(len(self._rows()), 2)

    def test_the_section_endpoints_are_mounted(self):
        client = TestClient(app)
        for path in ("/admin/cms/sections", "/admin/cms/integrity"):
            self.assertEqual(client.get(path).status_code, 401, f"{path} must exist and demand a session")
