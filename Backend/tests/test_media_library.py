"""The library: one copy of a file, and a trace before deletion."""
from __future__ import annotations

import unittest
import uuid

from core import (Base, Catalog, ContentDocument, MediaAsset, SessionLocal, content_hash,
                  engine, find_media_by_hash, media_usage_for, url_hash)


class MediaLibraryTest(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(engine)
        self.document_id = f"doc_media_{uuid.uuid4().hex[:8]}"
        self.asset_id = f"med_{uuid.uuid4().hex[:8]}"
        self.product_slug = f"prod-{uuid.uuid4().hex[:6]}"
        # Unique bytes per test: the hash is the identity, and another test
        # may already have stored the same content.
        self.digest = content_hash(f"bytes-{uuid.uuid4()}".encode())
        with SessionLocal() as db:
            db.add(MediaAsset(id=self.asset_id, owner_type="platform", owner_id="platform",
                              kind="image", url="https://cdn.test/hero.jpg", label="campaign-hero",
                              tags=["hero", "autumn"], origin_page="marketplace_home",
                              origin_section="sec_hero", content_hash=self.digest))
            db.commit()

    def test_the_same_bytes_are_found_whatever_the_file_is_called(self):
        with SessionLocal() as db:
            found = find_media_by_hash(db, self.digest)
            missing = find_media_by_hash(db, content_hash(b"different-bytes-entirely"))
        self.assertIsNotNone(found)
        self.assertEqual(found.id, self.asset_id)
        self.assertEqual(found.label, "campaign-hero")
        self.assertEqual(found.tags, ["hero", "autumn"])
        self.assertIsNone(missing)

    def test_a_url_hashes_to_a_stable_identity(self):
        self.assertEqual(url_hash(" https://cdn.test/a.jpg "), url_hash("https://cdn.test/a.jpg"))
        self.assertNotEqual(url_hash("https://cdn.test/a.jpg"), url_hash("https://cdn.test/b.jpg"))

    def test_a_section_slide_is_reported_as_a_use(self):
        with SessionLocal() as db:
            db.add(ContentDocument(id=self.document_id, owner_type="platform", owner_id="platform",
                                   document_type="marketplace_home", title="Home",
                                   status="published",
                                   data={"sections": [{"id": "sec_hero", "type": "hero_banner",
                                                       "slides": [{"assetId": self.asset_id,
                                                                   "kind": "image"}]}]}))
            db.commit()
        with SessionLocal() as db:
            uses = media_usage_for(db, self.asset_id)
        self.assertEqual(len(uses), 1)
        self.assertEqual(uses[0]["kind"], "section")
        self.assertEqual(uses[0]["sectionId"], "sec_hero")

    def test_a_product_image_is_reported_as_a_use(self):
        with SessionLocal() as db:
            db.add(Catalog(key=f"product:{self.product_slug}", kind="product",
                           slug=self.product_slug,
                           data={"title": "Tee", "images": [{"assetId": self.asset_id, "url": "x"}]}))
            db.commit()
        with SessionLocal() as db:
            uses = media_usage_for(db, self.asset_id)
        self.assertEqual([row["kind"] for row in uses], ["product"])

    def test_an_unused_file_reports_no_uses(self):
        with SessionLocal() as db:
            self.assertEqual(media_usage_for(db, self.asset_id), [])

    def test_after_the_slide_is_removed_the_file_is_free(self):
        with SessionLocal() as db:
            db.add(ContentDocument(id=self.document_id, owner_type="platform", owner_id="platform",
                                   document_type="marketplace_home", title="Home", status="published",
                                   data={"sections": [{"id": "sec_hero", "type": "hero_banner",
                                                       "slides": [{"assetId": self.asset_id}]}]}))
            db.commit()
        with SessionLocal() as db:
            document = db.get(ContentDocument, self.document_id)
            document.data = {"sections": [{"id": "sec_hero", "type": "hero_banner", "slides": []}]}
            db.commit()
            self.assertEqual(media_usage_for(db, self.asset_id), [])
