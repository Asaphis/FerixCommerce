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

    def test_a_seller_cannot_submit_outside_the_marketplace(self):
        rejected = self.submit(marketplace=False, store=True)
        self.assertEqual(rejected.status_code, 400, rejected.text)
