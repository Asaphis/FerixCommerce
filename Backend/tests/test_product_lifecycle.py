"""Marketplace product review and publication lifecycle contract tests.

Run from Backend with: python -m unittest discover -s tests -v
"""
from __future__ import annotations

import os
import tempfile
import unittest

_DB = tempfile.NamedTemporaryFile(prefix="ferixas-lifecycle-test-", suffix=".db", delete=False)
_DB.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_DB.name}"

from fastapi.testclient import TestClient  # noqa: E402
from app import app  # noqa: E402
from core import Order, SessionLocal  # noqa: E402


class ProductLifecycleTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.client.__enter__()
        admin = self.client.post("/admin/login", json={"email": "admin@ferixas.com", "password": "Ferixas123"})
        self.assertEqual(admin.status_code, 200, admin.text)
        self.admin = admin.json()["token"]
        merchant = self.client.post("/merchant/login", json={"email": "owner@abc-electronics.ferixas.com", "password": "Ferixas123"})
        self.assertEqual(merchant.status_code, 200, merchant.text)
        self.merchant = merchant.json()["token"]

    def tearDown(self):
        self.client.__exit__(None, None, None)

    def test_submission_stays_private_until_admin_approval(self):
        options = self.client.get("/merchant/product/options", headers={"X-Ferix-Session": self.merchant})
        self.assertEqual(options.status_code, 200, options.text)
        categories = options.json()["categories"]
        self.assertTrue(categories)
        category = categories[0]["slug"]

        created = self.client.post("/merchant/product", headers={"X-Ferix-Session": self.merchant}, json={
            "title": "Lifecycle Contract Product",
            "category": category,
            "price": 12.5,
            "stock": 4,
            "status": "approved",  # Seller-supplied status must be ignored.
            "store": True,
            "marketplace": True,
            "shipping_amount": 3.25,
            "estimated_delivery_days": 3,
        })
        self.assertEqual(created.status_code, 200, created.text)
        product = created.json()["product"]
        self.assertEqual(product["status"], "pending_review")
        self.assertEqual(product["reviewStatus"], "in_review")
        self.assertFalse(product["channels"]["store"])
        self.assertTrue(product["channels"]["marketplace"])
        self.assertEqual(self.client.get("/catalog/product", params={"slug": product["slug"]}).status_code, 404)

        queue = self.client.get("/admin/review/queue", headers={"X-Ferix-Session": self.admin})
        self.assertEqual(queue.status_code, 200, queue.text)
        queued = next(item for item in queue.json()["items"] if item["id"] == product["id"])
        self.assertEqual(queued["shipping_amount"], 3.25)
        self.assertEqual(queued["reviewStatus"], "in_review")

        changes = self.client.post("/admin/review/decision", headers={"X-Ferix-Session": self.admin}, json={
            "id": product["id"], "decision": "changes", "note": "Please clarify shipping details."
        })
        self.assertEqual(changes.status_code, 200, changes.text)
        changes_state = self.client.get("/admin/review/queue", headers={"X-Ferix-Session": self.admin}).json()
        changed = next(item for item in changes_state["items"] if item["id"] == product["id"])
        self.assertEqual(changed["reviewStatus"], "changes_requested")
        self.assertEqual(changed["reviewNote"], "Please clarify shipping details.")

        resubmitted = self.client.patch("/merchant/product", headers={"X-Ferix-Session": self.merchant}, json={
            "id": product["id"], "title": "Lifecycle Contract Product Revised", "category": category,
            "price": 12.5, "stock": 4, "marketplace": True, "store": False,
        })
        self.assertEqual(resubmitted.status_code, 200, resubmitted.text)
        self.assertEqual(resubmitted.json()["product"]["reviewStatus"], "in_review")
        approved = self.client.post("/admin/review/decision", headers={"X-Ferix-Session": self.admin}, json={
            "id": product["id"], "decision": "approve"
        })
        self.assertEqual(approved.status_code, 200, approved.text)
        self.assertEqual(approved.json()["product"]["reviewStatus"], "approved")
        public = self.client.get("/catalog/product", params={"slug": product["slug"]})
        self.assertEqual(public.status_code, 200, public.text)
        self.assertEqual(public.json()["product"]["status"], "approved")

        cart_id = "lifecycle-checkout-cart"
        added = self.client.post("/cart/items", headers={"X-Ferix-Cart": cart_id}, json={
            "productId": product["id"], "qty": 1, "cartId": cart_id,
        })
        self.assertEqual(added.status_code, 200, added.text)
        with SessionLocal() as db:
            before = len(db.query(Order).all())
        placed = self.client.post("/checkout/place", headers={"X-Ferix-Cart": cart_id}, json={
            "email": "checkout-test@example.com", "cartId": cart_id,
            "line1": "1 Example Road", "city": "Test City", "country": "Testland",
        })
        self.assertEqual(placed.status_code, 503, placed.text)
        with SessionLocal() as db:
            self.assertEqual(len(db.query(Order).all()), before)
        inventory = self.client.get("/merchant/product", headers={"X-Ferix-Session": self.merchant},
                                    params={"slug": product["slug"]})
        self.assertEqual(inventory.status_code, 200, inventory.text)
        self.assertEqual(inventory.json()["stock"], 4)

    def test_seller_cannot_create_listing_with_unmanaged_category(self):
        response = self.client.post("/merchant/product", headers={"X-Ferix-Session": self.merchant}, json={
            "title": "Invalid Taxonomy Product", "category": "seller-invented", "price": 10,
            "stock": 1, "marketplace": True,
        })
        self.assertEqual(response.status_code, 400, response.text)


if __name__ == "__main__":
    unittest.main()
