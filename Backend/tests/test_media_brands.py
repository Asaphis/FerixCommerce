"""Safe local smoke tests for media and brand contracts.

Run from Backend with: python3 -m unittest tests.test_media_brands
The database is a temporary SQLite file and no configured provider is contacted.
"""
from __future__ import annotations

import base64
import os
import tempfile
import unittest

_DB = tempfile.NamedTemporaryFile(prefix="ferixas-backend-test-", suffix=".db", delete=False)
_DB.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_DB.name}"
os.environ.pop("CLOUDINARY_URL", None)
PNG_1X1 = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/VwAAAABJRU5ErkJggg==")

from fastapi.testclient import TestClient  # noqa: E402
from app import app  # noqa: E402
from core import SessionLocal, backfill_catalogue_media, put_row, rows_of  # noqa: E402


class MediaAndBrandContractTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.client.__enter__()
        login = self.client.post("/admin/login", json={"email": "content@ferixas.com", "password": "Ferixas123"})
        self.assertEqual(login.status_code, 200, login.text)
        self.admin = login.json()["token"]
        merchant = self.client.post("/merchant/login", json={"email": "owner@abc-electronics.ferixas.com", "password": "Ferixas123"})
        self.assertEqual(merchant.status_code, 200, merchant.text)
        self.merchant = merchant.json()["token"]

    def tearDown(self):
        self.client.__exit__(None, None, None)

    def test_legacy_banner_media_url_is_repaired(self):
        db = SessionLocal()
        try:
            audio = next(row for row in rows_of(db, "banner") if row.get("id") == "bnr_audio")
            put_row(db, "banner", "bnr_audio", {
                **audio,
                "kind": "video",
                "image": "/banners/audio.svg",
                "imageUrl": "/banners/audio.svg",
                "mediaUrl": "/banners/audio.svg",
                "videoUrl": "/banners/audio.svg",
            })
            self.assertEqual(backfill_catalogue_media(db), 1)
            db.commit()
        finally:
            db.close()

        response = self.client.get("/admin/cms/banners", headers={"X-Ferix-Session": self.admin})
        self.assertEqual(response.status_code, 200, response.text)
        audio = next(row for row in response.json()["banners"] if row.get("id") == "bnr_audio")
        self.assertEqual(audio["mediaUrl"], "/media/banners/bnr_audio.jpg")
        self.assertEqual(audio["kind"], "image")
        self.assertIsNone(audio["videoUrl"])
        self.assertEqual(self.client.get(audio["mediaUrl"]).status_code, 200)

        db = SessionLocal()
        try:
            audio = next(row for row in rows_of(db, "banner") if row.get("id") == "bnr_audio")
            put_row(db, "banner", "bnr_audio", {**audio, "kind": "video", "videoUrl": "/banners/audio.svg"})
            self.assertEqual(backfill_catalogue_media(db), 1)
            db.commit()
        finally:
            db.close()
        response = self.client.get("/admin/cms/banners", headers={"X-Ferix-Session": self.admin})
        self.assertEqual(response.status_code, 200, response.text)
        audio = next(row for row in response.json()["banners"] if row.get("id") == "bnr_audio")
        self.assertEqual(audio["kind"], "image")
        self.assertIsNone(audio["videoUrl"])

    def test_brand_crud_and_public_visibility(self):
        headers = {"X-Ferix-Session": self.admin}
        response = self.client.post("/admin/cms/brand", headers=headers, json={
            "name": "Local Test Brand", "slug": "local-test-brand", "description": "Test",
            "imageUrl": "/uploads/test.png", "featured": True, "visible": True, "position": 2,
        })
        self.assertEqual(response.status_code, 200, response.text)
        brand = response.json()["brand"]
        self.assertIn(brand["id"], [row["id"] for row in self.client.get("/catalog/brands").json()["brands"]])
        self.assertEqual(self.client.post("/admin/cms/brand", headers=headers, json={"name": "Duplicate", "slug": "local-test-brand"}).status_code, 409)
        response = self.client.patch("/admin/cms/brand", headers=headers, json={"id": brand["id"], "visible": False, "slug": "local-test-brand-updated"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertNotIn(brand["id"], [row["id"] for row in self.client.get("/catalog/brands").json()["brands"]])
        self.assertEqual(self.client.request("DELETE", "/admin/cms/brand", headers=headers, json={"id": brand["id"]}).status_code, 200)

    def test_upload_mount_and_permission(self):
        headers = {"X-Ferix-Session": self.merchant}
        response = self.client.post("/merchant/media/upload", headers=headers,
                                    files={"file": ("contract-test.png", PNG_1X1, "image/png")},
                                    data={"kind": "image"})
        self.assertEqual(response.status_code, 200, response.text)
        asset = response.json()["asset"]
        self.assertIn("/uploads/", asset["url"])
        fetched = self.client.get(asset["url"])
        self.assertEqual((fetched.status_code, fetched.content), (200, PNG_1X1))
        removed = self.client.request("DELETE", "/merchant/media", headers=headers, json={"id": asset["id"]})
        self.assertEqual(removed.status_code, 200, removed.text)
        self.assertEqual(removed.json()["cleanup"], "local")

        admin_headers = {"X-Ferix-Session": self.admin}
        admin_upload = self.client.post("/admin/media/upload", headers=admin_headers,
                                        files={"file": ("cms-banner.png", PNG_1X1, "image/png")},
                                        data={"kind": "image", "folder": "banners"})
        self.assertEqual(admin_upload.status_code, 200, admin_upload.text)
        admin_asset = admin_upload.json()["asset"]
        self.assertEqual(admin_asset["folder"], "banners")
        self.assertEqual(self.client.request("DELETE", "/admin/media", headers=admin_headers,
                                             json={"id": admin_asset["id"]}).status_code, 200)

        bad_file = self.client.post("/merchant/media/upload", headers=headers,
                                    files={"file": ("not-an-image.png", b"<script>not media</script>", "image/png")},
                                    data={"kind": "image"})
        self.assertEqual(bad_file.status_code, 415, bad_file.text)

        mp4_header = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 12
        video = self.client.post("/merchant/media/upload", headers=headers,
                                 files={"file": ("contract-test.mp4", mp4_header, "video/mp4")},
                                 data={"kind": "video"})
        self.assertEqual(video.status_code, 200, video.text)
        self.assertEqual(video.json()["asset"]["kind"], "video")
        self.client.request("DELETE", "/merchant/media", headers=headers, json={"id": video.json()["asset"]["id"]})
        self.assertEqual(self.client.post("/merchant/media/upload", headers={"X-Ferix-Session": self.admin},
                                          files={"file": ("denied.png", PNG_1X1, "image/png")},
                                          data={"kind": "image"}).status_code, 401)


if __name__ == "__main__":
    unittest.main()
