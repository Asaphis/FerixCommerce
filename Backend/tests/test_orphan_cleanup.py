"""Cleaning placements whose section no longer exists."""
from __future__ import annotations

import unittest
import uuid

from sqlalchemy import select

from core import (Base, ContentDocument, SectionPlacement, SessionLocal,
                  delete_orphan_placements, engine, new_id, orphan_placements,
                  sync_document_sections)


class OrphanCleanupTest(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(engine)
        self.document_id = f"doc_test_{uuid.uuid4().hex[:10]}"
        with SessionLocal() as db:
            db.add(ContentDocument(id=self.document_id, owner_type="platform", owner_id="platform",
                                   document_type="marketplace_home", title="Cleanup page",
                                   status="published",
                                   data={"sections": [{"id": "sec_kept", "type": "product_carousel",
                                                       "position": 1, "visible": True}]}))
            db.commit()
        with SessionLocal() as db:
            sync_document_sections(db, db.get(ContentDocument, self.document_id))
            db.commit()
        self.kept = self._place("sec_kept")
        self.lost = self._place("sec_gone")

    def _place(self, section_id):
        placement_id = new_id("plc")
        with SessionLocal() as db:
            db.add(SectionPlacement(id=placement_id, product_id="prd_x", product_slug="prd-x",
                                    document_id=self.document_id, section_id=section_id,
                                    section_type="product_carousel"))
            db.commit()
        return placement_id

    def _live(self):
        with SessionLocal() as db:
            return {row.id for row in db.scalars(select(SectionPlacement)).all()}

    def test_a_dry_run_reports_without_deleting(self):
        with SessionLocal() as db:
            result = delete_orphan_placements(db, dry_run=True)
            db.commit()
        mine = [row for row in result["placements"] if row["documentId"] == self.document_id]
        self.assertEqual([row["sectionId"] for row in mine], ["sec_gone"])
        self.assertIn(self.lost, self._live())

    def test_applying_removes_only_the_orphans(self):
        with SessionLocal() as db:
            delete_orphan_placements(db, dry_run=False)
            db.commit()
        live = self._live()
        self.assertIn(self.kept, live)
        self.assertNotIn(self.lost, live)

    def test_the_report_is_empty_for_this_page_afterwards(self):
        with SessionLocal() as db:
            delete_orphan_placements(db, dry_run=False)
            db.commit()
            remaining = [row for row in orphan_placements(db) if row["documentId"] == self.document_id]
        self.assertEqual([], remaining)
