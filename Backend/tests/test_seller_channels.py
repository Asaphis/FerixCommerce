"""Seller submission destination contract.

A product uploaded from the Seller workspace is always a Ferixas Marketplace
submission awaiting Admin review. It may additionally be marked for the seller's
own website; that is recorded on the same record so the product never has to be
uploaded twice. These tests pin both halves of that contract.
"""
from __future__ import annotations

import os
import tempfile
import unittest
import uuid

_DB = tempfile.NamedTemporaryFile(prefix="ferixas-channels-test-", suffix=".db", delete=False)
_DB.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_DB.name}"
os.environ["FERIXAS_ENV"] = "test"
os.environ["FERIXAS_TEST_STAFF_PASSWORD"] = "TestOnly-Password-123!"

from fastapi.testclient import TestClient  # noqa: E402

from app import app  # noqa: E402
from test_support import reset_test_database  # noqa: E402


class SellerChannelTest(unittest.TestCase):
    def setUp(self):
        reset_test_database()
        self.client = TestClient(app)
        self.client.__enter__()
        login = self.client.post("/merchant/login", json={
            "email": "owner@abc-electronics.ferixas.com",
            "password": "TestOnly-Password-123!",
        })
        self.assertEqual(login.status_code, 200, login.text)
        self.session = login.json()["token"]
        options = self.client.get("/merchant/product/options", params={"session": self.session})
        self.assertEqual(options.status_code, 200, options.text)
        self.options = options.json()

    def tearDown(self):
        self.client.__exit__(None, None, None)

    def submit(self, **overrides):
        body = {
            "session": self.session,
            "title": f"Destination product {uuid.uuid4().hex[:6]}",
            "category": self.options["categories"][0]["slug"],
            "price": 24.5,
            "stock": 3,
            "status": "pending_review",
            "store": True,
            "marketplace": True,
            "images": ["placeholder://channel-1"],
        }
        if self.options["sections"]:
            body["section_tags"] = [self.options["sections"][0]["value"]]
        body.update(overrides)
        return self.client.post("/merchant/product", json=body)

    def test_submission_is_marketplace_review_and_may_join_the_own_website(self):
        created = self.submit()
        self.assertEqual(created.status_code, 200, created.text)
        product = created.json()["product"]
        self.assertEqual(product["status"], "pending_review")
        self.assertEqual(product["channels"], {"store": True, "marketplace": True})

        # The selling account can reopen its own submission by slug and by id.
        for key, value in (("slug", product["slug"]), ("id", product["id"])):
            read = self.client.get("/merchant/product", params={key: value, "session": self.session})
            self.assertEqual(read.status_code, 200, f"{key} lookup failed: {read.text}")
            self.assertTrue(read.json()["product"]["channels"]["marketplace"])
            self.assertTrue(read.json()["product"]["channels"]["store"])

        listed = self.client.get("/merchant/products", params={"channel": "store", "session": self.session})
        self.assertEqual(listed.status_code, 200, listed.text)
        self.assertIn(product["id"], [item["id"] for item in listed.json()["items"]])

    def test_own_website_choice_can_be_changed_without_losing_the_submission(self):
        created = self.submit(store=False)
        self.assertEqual(created.status_code, 200, created.text)
        product = created.json()["product"]
        self.assertEqual(product["channels"], {"store": False, "marketplace": True})

        updated = self.client.patch("/merchant/product", json={
            "session": self.session, "id": product["id"], "store": True,
        })
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(updated.json()["product"]["channels"], {"store": True, "marketplace": True})

    def test_the_section_picker_answers_before_a_product_exists(self):
        """The upload form must list product sections, not a "nothing here yet" placeholder."""
        login = self.client.post("/admin/login", json={
            "email": "admin@ferixas.test", "password": "TestOnly-Password-123!",
        })
        self.assertEqual(login.status_code, 200, login.text)
        admin = login.json()["token"]

        fresh = self.client.get("/admin/product/sections", headers={"X-Ferix-Session": admin})
        self.assertEqual(fresh.status_code, 200, fresh.text)
        body = fresh.json()
        self.assertTrue(body["available"], "the new-product form saw no product sections")
        self.assertEqual(body["placements"], [])
        self.assertTrue(all(row.get("documentTitle") for row in body["available"]))

        # Asking for an existing product adds only the "already placed here" half.
        placed = self.client.get(
            "/admin/product/sections", headers={"X-Ferix-Session": admin}, params={"slug": "any-product"},
        )
        self.assertEqual(placed.status_code, 200, placed.text)
        self.assertEqual(
            [row["sectionId"] for row in body["available"]],
            [row["sectionId"] for row in placed.json()["available"]],
        )

    def test_a_seller_cannot_submit_outside_the_marketplace(self):
        rejected = self.submit(marketplace=False, store=True)
        self.assertEqual(rejected.status_code, 400, rejected.text)

    def test_a_saved_product_moves_between_destinations_without_being_uploaded_again(self):
        created = self.submit(store=False)
        self.assertEqual(created.status_code, 200, created.text)
        product = created.json()["product"]
        self.assertEqual(product["channels"], {"store": False, "marketplace": True})

        # Same product, now also kept for the seller's own website.
        added = self.client.post("/merchant/product/destination", json={
            "session": self.session, "id": product["id"], "store": True,
        })
        self.assertEqual(added.status_code, 200, added.text)
        self.assertEqual(added.json()["product"]["channels"], {"store": True, "marketplace": True})
        self.assertEqual(added.json()["product"]["id"], product["id"])

        # Withdraw the Ferixas submission; the record and its own-website listing stay.
        withdrawn = self.client.post("/merchant/product/destination", json={
            "session": self.session, "id": product["id"], "marketplace": False,
        })
        self.assertEqual(withdrawn.status_code, 200, withdrawn.text)
        draft = withdrawn.json()["product"]
        self.assertEqual(draft["channels"], {"store": True, "marketplace": False})
        self.assertEqual(draft["status"], "draft")

        # A withdrawn product is still the seller's: it is listed and readable.
        library = self.client.get("/merchant/products", params={"channel": "store", "session": self.session})
        self.assertEqual(library.status_code, 200, library.text)
        self.assertIn(product["id"], [item["id"] for item in library.json()["items"]])
        readable = self.client.get("/merchant/product", params={"id": product["id"], "session": self.session})
        self.assertEqual(readable.status_code, 200, readable.text)

        # Re-submitting reuses the same record and returns it to review.
        resubmitted = self.client.post("/merchant/product/destination", json={
            "session": self.session, "id": product["id"], "marketplace": True,
        })
        self.assertEqual(resubmitted.status_code, 200, resubmitted.text)
        again = resubmitted.json()["product"]
        self.assertEqual(again["channels"], {"store": True, "marketplace": True})
        self.assertEqual(again["status"], "pending_review")
        self.assertEqual(again["id"], product["id"])

        # Every move is part of the product's own history.
        detail = self.client.get("/merchant/product", params={"id": product["id"], "session": self.session})
        self.assertEqual(detail.status_code, 200, detail.text)
        labels = [event["label"] for event in detail.json()["history"]]
        self.assertIn("Destination changed", labels)
