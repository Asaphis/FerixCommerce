"""Regression tests for the backend correction audit's high-impact security/data rules."""
from __future__ import annotations

import os
import tempfile
import unittest
import uuid

_DB = tempfile.NamedTemporaryFile(prefix="ferixas-security-test-", suffix=".db", delete=False)
_DB.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_DB.name}"
os.environ["FERIXAS_ENV"] = "test"
os.environ["FERIXAS_TEST_STAFF_PASSWORD"] = "TestOnly-Password-123!"
os.environ.pop("FERIXAS_STUDIO_ENABLED", None)

from fastapi.testclient import TestClient  # noqa: E402
from app import app  # noqa: E402
from core import Order, SessionLocal, find_merchant, find_product, hash_password, put_row, User  # noqa: E402
from test_support import reset_test_database  # noqa: E402


class BackendSecurityCorrectionsTest(unittest.TestCase):
    def setUp(self):
        reset_test_database()
        self.client = TestClient(app)
        self.client.__enter__()
        admin = self.client.post("/admin/login", json={"email": "admin@ferixas.test", "password": os.environ["FERIXAS_TEST_STAFF_PASSWORD"]})
        self.assertEqual(admin.status_code, 200, admin.text)
        self.admin = admin.json()["token"]
        seller = self.client.post("/merchant/login", json={"email": "owner@abc-electronics.ferixas.com", "password": os.environ["FERIXAS_TEST_STAFF_PASSWORD"]})
        self.assertEqual(seller.status_code, 200, seller.text)
        self.seller = seller.json()["token"]
        self.created_user_ids = []

    def tearDown(self):
        with SessionLocal() as db:
            for user_id in self.created_user_ids:
                user = db.get(User, user_id)
                if user:
                    user.settings = {**(user.settings or {}), "followed_sellers": []}
            db.commit()
        self.client.__exit__(None, None, None)

    def _shopper(self):
        email = f"security-{uuid.uuid4().hex[:8]}@example.com"
        response = self.client.post("/auth/register", json={"name": "Security Shopper", "email": email, "password": "Shopper-Test-Password-123!"})
        self.assertEqual(response.status_code, 200, response.text)
        user_id = response.json()["user"]["id"]
        self.created_user_ids.append(user_id)
        return response.json()["token"], user_id

    def test_cart_requires_session_and_rejects_other_owner(self):
        token_a, _ = self._shopper()
        token_b, _ = self._shopper()
        product = self.client.get("/catalog/products").json()["items"][0]
        cart_id = f"owned-{uuid.uuid4().hex[:10]}"
        added = self.client.post("/cart/items", headers={"X-Ferix-Session": token_a, "X-Ferix-Cart": cart_id}, json={"productId": product["id"], "qty": 1, "cartId": cart_id})
        self.assertEqual(added.status_code, 200, added.text)
        self.assertEqual(self.client.get("/cart", params={"cartId": cart_id}).status_code, 401)
        other_read = self.client.get("/cart", headers={"X-Ferix-Session": token_b}, params={"cartId": cart_id})
        self.assertEqual(other_read.status_code, 403, other_read.text)
        other_update = self.client.patch("/cart/items", headers={"X-Ferix-Session": token_b}, json={"cartId": cart_id, "key": f"{product['id']}::", "qty": 0})
        self.assertEqual(other_update.status_code, 403, other_update.text)
        guest_quote = self.client.post("/checkout/quote", json={"cartId": cart_id, "email": "known@example.com"})
        self.assertEqual(guest_quote.status_code, 401, guest_quote.text)

    def test_review_requires_paid_delivery_and_is_unique(self):
        token, user_id = self._shopper()
        product = self.client.get("/catalog/products").json()["items"][0]
        with SessionLocal() as db:
            db.add(Order(id=f"ord-{uuid.uuid4().hex[:10]}", user_id=user_id, data={"channel": "marketplace", "payment": "pending", "fulfillment": "delivered", "items": [{"productId": product["id"], "qty": 1}]}))
            db.commit()
        unpaid = self.client.post("/account/reviews", headers={"X-Ferix-Session": token}, json={"productId": product["id"], "rating": 5})
        self.assertEqual(unpaid.status_code, 403, unpaid.text)
        with SessionLocal() as db:
            db.add(Order(id=f"ord-{uuid.uuid4().hex[:10]}", user_id=user_id, data={"channel": "marketplace", "payment": "captured", "fulfillment": "delivered", "items": [{"productId": product["id"], "qty": 1}]}))
            db.commit()
        created = self.client.post("/account/reviews", headers={"X-Ferix-Session": token}, json={"productId": product["id"], "rating": 5, "title": "Good", "body": "Arrived."})
        self.assertEqual(created.status_code, 200, created.text)
        duplicate = self.client.post("/account/reviews", headers={"X-Ferix-Session": token}, json={"productId": product["id"], "rating": 4})
        self.assertEqual(duplicate.status_code, 409, duplicate.text)

    def test_seller_promotion_is_own_approved_product_only(self):
        own = self.client.get("/merchant/products", headers={"X-Ferix-Session": self.seller}).json()["items"][0]
        with SessionLocal() as db:
            other = next(p for p in __import__("core").products(db) if p.get("merchantId") != "abc-electronics" and p.get("status") == "approved")
        cross = self.client.post("/merchant/promotions", headers={"X-Ferix-Session": self.seller}, json={"name": "Cross store", "items": [{"productId": other["id"], "salePrice": 1, "quantityLimit": 1}]})
        self.assertEqual(cross.status_code, 409, cross.text)
        valid_price = max(0.01, float(own["price"]) / 2)
        valid = self.client.post("/merchant/promotions", headers={"X-Ferix-Session": self.seller}, json={"name": "Own store", "items": [{"productId": own["id"], "salePrice": valid_price, "quantityLimit": 1}]})
        self.assertEqual(valid.status_code, 200, valid.text)

    def test_studio_is_read_only_while_coming_soon(self):
        before = self.client.get("/merchant/storefront", headers={"X-Ferix-Session": self.seller})
        self.assertEqual(before.status_code, 200, before.text)
        self.assertEqual(before.json()["designEngine"], "coming_soon")
        blocked = self.client.patch("/merchant/storefront", headers={"X-Ferix-Session": self.seller}, json={"theme": {"accent": "#000"}, "status": "published"})
        self.assertEqual(blocked.status_code, 503, blocked.text)

    def test_public_store_gate_and_admin_follows(self):
        token, user_id = self._shopper()
        follow = self.client.post("/sellers/abc-electronics/follow", headers={"X-Ferix-Session": token})
        self.assertEqual(follow.status_code, 200, follow.text)
        detail = self.client.get("/admin/user", headers={"X-Ferix-Session": self.admin}, params={"id": user_id})
        self.assertEqual(detail.status_code, 200, detail.text)
        self.assertEqual(detail.json()["stats"]["follows"], 1)
        self.assertEqual(detail.json()["follows"][0]["id"], "abc-electronics")
        with SessionLocal() as db:
            merchant = find_merchant(db, "abc-electronics")
            original = dict(merchant)
            updated = dict(merchant)
            updated["status"] = "suspended"
            put_row(db, "merchant", merchant["slug"], updated)
            db.commit()
        try:
            self.assertEqual(self.client.get("/catalog/store", params={"slug": "abc-electronics"}).status_code, 404)
            self.assertNotIn("abc-electronics", [m["id"] for m in self.client.get("/catalog/stores").json()["stores"]])
        finally:
            with SessionLocal() as db:
                put_row(db, "merchant", original["slug"], original)
                db.commit()


if __name__ == "__main__":
    unittest.main()
