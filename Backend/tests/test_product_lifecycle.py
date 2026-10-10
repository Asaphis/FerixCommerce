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
from core import ContentDocument, ContentVersion, MerchantProfileRequest, Order, SessionLocal, find_merchant, put_row  # noqa: E402


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
        other_login = self.client.post("/merchant/login", json={"email": "owner@aurasound.ferixas.com", "password": "Ferixas123"})
        self.assertEqual(other_login.status_code, 200, other_login.text)
        other_token = other_login.json()["token"]
        first_items = self.client.get("/merchant/products", headers={"X-Ferix-Session": self.merchant}).json()["items"]
        other_items = self.client.get("/merchant/products", headers={"X-Ferix-Session": other_token}).json()["items"]
        self.assertFalse({item["id"] for item in first_items} & {item["id"] for item in other_items})
        options = self.client.get("/merchant/product/options", headers={"X-Ferix-Session": self.merchant})
        self.assertEqual(options.status_code, 200, options.text)
        categories = options.json()["categories"]
        self.assertTrue(categories)
        category = categories[0]["slug"]
        collections = options.json()["collections"]

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
            "package_weight": 1.2,
            "package_dimensions": "20 x 15 x 10 cm",
            "shipping_origin": "Test City",
            "description": "A durable, lightweight lifecycle test product.",
            "sku": "SELLER-TEST-001",
            "lowStockAt": 2,
            "bullets": ["Durable", "Lightweight"],
            "tags": ["test", "lifecycle"],
            "variants": [{"name": "Color", "values": ["Black", "Blue"]}],
            "seoTitle": "Lifecycle Test Listing",
            "seoDescription": "Listing field round-trip test.",
            "collections": [collections[0]["slug"]] if collections else [],
        })
        self.assertEqual(created.status_code, 200, created.text)
        product = created.json()["product"]
        self.assertEqual(product["status"], "pending_review")
        self.assertEqual(product["reviewStatus"], "in_review")
        self.assertFalse(product["channels"]["store"])
        self.assertTrue(product["channels"]["marketplace"])
        self.assertEqual(product["sku"], "SELLER-TEST-001")
        self.assertEqual(product["bullets"], ["Durable", "Lightweight"])
        self.assertEqual(product["variants"][0]["values"], ["Black", "Blue"])
        self.assertEqual(product["package_weight"], 1.2)
        self.assertEqual(product["collections"], [collections[0]["slug"]] if collections else [])
        self.assertEqual(self.client.get("/catalog/product", params={"slug": product["slug"]}).status_code, 404)

        merchant_products = self.client.get("/merchant/products", headers={"X-Ferix-Session": self.merchant})
        self.assertEqual(merchant_products.status_code, 200, merchant_products.text)
        owned_matches = [item for item in merchant_products.json()["items"] if item["id"] == product["id"]]
        self.assertEqual(len(owned_matches), 1)
        self.assertEqual(owned_matches[0]["status"], "pending_review")

        platform_catalog = self.client.get("/admin/catalog/products", headers={"X-Ferix-Session": self.admin}, params={"owner": "official"})
        seller_catalog = self.client.get("/admin/catalog/products", headers={"X-Ferix-Session": self.admin}, params={"owner": "seller"})
        self.assertEqual(platform_catalog.status_code, 200, platform_catalog.text)
        self.assertEqual(seller_catalog.status_code, 200, seller_catalog.text)
        self.assertNotIn(product["id"], {item["id"] for item in platform_catalog.json()["products"]})
        self.assertEqual(sum(item["id"] == product["id"] for item in seller_catalog.json()["products"]), 1)

        queue = self.client.get("/admin/review/queue", headers={"X-Ferix-Session": self.admin})
        self.assertEqual(queue.status_code, 200, queue.text)
        queued = next(item for item in queue.json()["items"] if item["id"] == product["id"])
        self.assertEqual(queued["shipping_amount"], 3.25)
        self.assertEqual(queued["package_dimensions"], "20 x 15 x 10 cm")
        self.assertEqual(queued["shipping_origin"], "Test City")
        self.assertEqual(queued["description"], "A durable, lightweight lifecycle test product.")
        self.assertEqual(queued["variants"][0]["name"], "Color")
        self.assertEqual(queued["collections"], product["collections"])
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

    def test_seller_profile_requires_review_and_private_contact_stays_private(self):
        with SessionLocal() as db:
            original = dict(find_merchant(db, "abc-electronics"))
        try:
            public_before = self.client.get("/catalog/store", params={"slug": "abc-electronics"}).json()
            proposed = {
                "name": original["name"], "tagline": "Seller-submitted tagline",
                "about": "Seller-submitted description", "location": "Accra, Ghana",
                "businessName": "ABC Electronics Ltd", "businessEmail": "contact@example.com",
                "businessPhone": "+233200000000", "addressLine1": "123 Private Street",
                "addressLine2": "Unit 4", "city": "Accra", "region": "Greater Accra",
                "postalCode": "GA-100", "country": "Ghana", "website": "https://seller.example",
                "showBusinessEmail": False, "showPhone": True,
            }
            submitted = self.client.post("/merchant/profile/request", headers={"X-Ferix-Session": self.merchant}, json=proposed)
            self.assertEqual(submitted.status_code, 200, submitted.text)
            request_id = submitted.json()["request"]["id"]
            during_review = self.client.get("/catalog/store", params={"slug": "abc-electronics"}).json()
            self.assertEqual(during_review["store"]["name"], public_before["store"]["name"])
            self.assertNotEqual(during_review["store"].get("website"), proposed["website"])

            direct_edit = self.client.patch("/admin/merchant", headers={"X-Ferix-Session": self.admin},
                                            json={"id": "abc-electronics", "name": "Admin Direct Edit"})
            self.assertEqual(direct_edit.status_code, 200, direct_edit.text)
            self.assertEqual(direct_edit.json()["merchant"]["name"], original["name"])
            decision = self.client.post("/admin/merchant/profile-request/decision", headers={"X-Ferix-Session": self.admin},
                                        json={"id": request_id, "decision": "approve"})
            self.assertEqual(decision.status_code, 200, decision.text)
            after = self.client.get("/catalog/store", params={"slug": "abc-electronics"}).json()
            self.assertEqual(after["store"]["website"], proposed["website"])
            self.assertNotIn("businessEmail", after["store"])
            self.assertEqual(after["store"]["businessPhone"], proposed["businessPhone"])
            self.assertNotIn("123 Private Street", str(after))
        finally:
            with SessionLocal() as db:
                put_row(db, "merchant", original["slug"], original)
                for request in db.query(MerchantProfileRequest).filter_by(merchant_id=original["id"]).all():
                    db.delete(request)
                db.commit()

    def test_cms_draft_preserves_hidden_section_fields_and_live_content_until_publish(self):
        document_id = "cms-lossless-contract"
        with SessionLocal() as db:
            db.add(ContentDocument(
                id=document_id, owner_type="platform", owner_id="platform", document_type="test_page",
                title="Test page", status="published",
                data={"globalSettings": {"theme": "warm"}, "sections": [
                    {"id": "hero", "type": "hero_banner", "title": "Old title", "visible": True,
                     "heroConfig": {"scrim": 75, "align": "right"}, "customField": "keep-me"},
                    {"id": "products", "type": "product_carousel", "title": "Keep section", "visible": True},
                ]},
            ))
            db.commit()
        try:
            saved = self.client.patch("/admin/cms/document", headers={"X-Ferix-Session": self.admin}, json={
                "id": document_id, "data": {"sections": [
                    {"id": "hero", "title": "New title", "position": 1},
                    {"id": "products", "title": "Keep section", "position": 2},
                ]}, "note": "Contract save",
            })
            self.assertEqual(saved.status_code, 200, saved.text)
            draft = saved.json()["document"]["data"]
            self.assertEqual(draft["globalSettings"], {"theme": "warm"})
            self.assertEqual(draft["sections"][0]["title"], "New title")
            self.assertEqual(draft["sections"][0]["heroConfig"], {"scrim": 75, "align": "right"})
            self.assertEqual(draft["sections"][0]["customField"], "keep-me")
            self.assertEqual(len(draft["sections"]), 2)
            with SessionLocal() as db:
                live = db.get(ContentDocument, document_id)
                self.assertEqual(live.data["sections"][0]["title"], "Old title")
                self.assertEqual(db.query(ContentVersion).filter_by(document_id=document_id, status="draft").count(), 1)
            published = self.client.post("/admin/cms/document/publish", headers={"X-Ferix-Session": self.admin}, json={"id": document_id})
            self.assertEqual(published.status_code, 200, published.text)
            self.assertEqual(published.json()["document"]["data"]["sections"][0]["title"], "New title")
        finally:
            with SessionLocal() as db:
                db.query(ContentVersion).filter_by(document_id=document_id).delete()
                doc = db.get(ContentDocument, document_id)
                if doc:
                    db.delete(doc)
                db.commit()


if __name__ == "__main__":
    unittest.main()
