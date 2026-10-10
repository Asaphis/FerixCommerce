"""Marketplace product review and publication lifecycle contract tests.

Run from Backend with: python -m unittest discover -s tests -v
"""
from __future__ import annotations

import json
import os
import tempfile
import unittest
import uuid

_DB = tempfile.NamedTemporaryFile(prefix="ferixas-lifecycle-test-", suffix=".db", delete=False)
_DB.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_DB.name}"

from fastapi.testclient import TestClient  # noqa: E402
from app import app  # noqa: E402
from core import (ContentDocument, ContentVersion, MerchantProfileRequest, Order, SessionLocal,
                  Review, SessionToken, User, drop_row, find_merchant, hash_password, put_row)  # noqa: E402


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
        self.assertEqual(platform_catalog.status_code, 200, platform_catalog.text)
        self.assertNotIn(product["id"], {item["id"] for item in platform_catalog.json()["products"]})
        self.assertEqual(self.client.get("/admin/catalog/products", headers={"X-Ferix-Session": self.admin}, params={"owner": "seller"}).status_code, 400)
        self.assertEqual(self.client.get("/admin/catalog/products", headers={"X-Ferix-Session": self.admin}, params={"owner": "all"}).status_code, 400)
        generic_update = self.client.patch("/admin/catalog/product", headers={"X-Ferix-Session": self.admin}, json={"id": product["id"], "status": "approved"})
        self.assertEqual(generic_update.status_code, 403, generic_update.text)
        legacy_approval = self.client.patch("/admin/catalog/products/approve", headers={"X-Ferix-Session": self.admin}, json={"id": product["id"]})
        self.assertEqual(legacy_approval.status_code, 410, legacy_approval.text)

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
        self.assertNotIn("status", public.json()["product"])
        self.assertEqual(public.json()["product"]["stockStatus"], "in_stock")

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
                "logo": "https://cdn.example.test/seller-logo.png",
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
            self.assertEqual(during_review["store"].get("logo"), public_before["store"].get("logo"))
            self.assertNotIn("website", during_review["store"])
            queue = self.client.get("/admin/merchant/profile-requests", headers={"X-Ferix-Session": self.admin})
            self.assertEqual(queue.status_code, 200, queue.text)
            queued = next(item for item in queue.json()["items"] if item["request"]["id"] == request_id)
            self.assertEqual(queued["request"]["profile"]["logo"], proposed["logo"])

            direct_edit = self.client.patch("/admin/merchant", headers={"X-Ferix-Session": self.admin},
                                            json={"id": "abc-electronics", "name": "Admin Direct Edit"})
            self.assertEqual(direct_edit.status_code, 422, direct_edit.text)
            decision = self.client.post("/admin/merchant/profile-request/decision", headers={"X-Ferix-Session": self.admin},
                                        json={"id": request_id, "decision": "approve"})
            self.assertEqual(decision.status_code, 200, decision.text)
            after = self.client.get("/catalog/store", params={"slug": "abc-electronics"}).json()
            self.assertEqual(after["store"]["logo"], proposed["logo"])
            self.assertNotIn("website", after["store"])
            self.assertNotIn("businessEmail", after["store"])
            self.assertEqual(after["store"]["businessPhone"], proposed["businessPhone"])
            self.assertNotIn("123 Private Street", str(after))
        finally:
            with SessionLocal() as db:
                put_row(db, "merchant", original["slug"], original)
                for request in db.query(MerchantProfileRequest).filter_by(merchant_id=original["id"]).all():
                    db.delete(request)
                db.commit()

    def test_seller_audience_counts_real_follows_without_exposing_shopper_identity(self):
        suffix = uuid.uuid4().hex[:10]
        user_id = f"usr_audience_{suffix}"
        email = f"audience-{suffix}@example.com"
        original_merchant = None
        try:
            baseline = self.client.get("/merchant/followers", headers={"X-Ferix-Session": self.merchant})
            self.assertEqual(baseline.status_code, 200, baseline.text)
            with SessionLocal() as db:
                original_merchant = dict(find_merchant(db, "abc-electronics"))
                db.add(User(id=user_id, name="Private Shopper Name", email=email,
                            password_hash=hash_password("Isolated-Test-Password-123!"),
                            settings={"followed_sellers": []}))
                db.commit()
            login = self.client.post("/auth/login", json={"email": email, "password": "Isolated-Test-Password-123!"})
            self.assertEqual(login.status_code, 200, login.text)
            shopper_session = login.json()["token"]

            followed = self.client.post("/sellers/abc-electronics/follow", headers={"X-Ferix-Session": shopper_session})
            self.assertEqual(followed.status_code, 200, followed.text)
            audience = self.client.get("/merchant/followers", headers={"X-Ferix-Session": self.merchant})
            self.assertEqual(audience.status_code, 200, audience.text)
            self.assertEqual(audience.json()["followers"], baseline.json()["followers"] + 1)
            self.assertEqual(audience.json()["recent"][0]["action"], "follow")
            self.assertNotIn(user_id, json.dumps(audience.json()))
            self.assertNotIn(email, json.dumps(audience.json()))
            self.assertNotIn("Private Shopper Name", json.dumps(audience.json()))

            unfollowed = self.client.delete("/sellers/abc-electronics/follow", headers={"X-Ferix-Session": shopper_session})
            self.assertEqual(unfollowed.status_code, 200, unfollowed.text)
            after_unfollow = self.client.get("/merchant/followers", headers={"X-Ferix-Session": self.merchant})
            self.assertEqual(after_unfollow.json()["followers"], baseline.json()["followers"])
            self.assertEqual(after_unfollow.json()["recent"][0]["action"], "unfollow")
            self.assertEqual(after_unfollow.json()["net30d"], 0)
        finally:
            with SessionLocal() as db:
                if original_merchant:
                    put_row(db, "merchant", original_merchant["slug"], original_merchant)
                db.query(SessionToken).filter_by(user_id=user_id).delete(synchronize_session=False)
                db.query(User).filter_by(id=user_id).delete(synchronize_session=False)
                db.commit()

    def test_public_product_and_reviews_exclude_internal_metrics_and_shopper_pii(self):
        suffix = uuid.uuid4().hex[:10]
        slug = f"privacy-contract-{suffix}"
        user_id = f"usr_privacy_{suffix}"
        email = f"private-{suffix}@example.test"
        product_id = f"prod_privacy_{suffix}"
        review_id = f"rev_privacy_{suffix}"
        with SessionLocal() as db:
            merchant = dict(find_merchant(db, "abc-electronics"))
            product = {
                "id": product_id, "slug": slug, "title": "Privacy Contract Listing",
                "merchantId": merchant["id"], "merchantName": merchant["name"],
                "merchantSlug": merchant["slug"], "brandName": "Test Brand",
                "category": "electronics", "description": "Public description",
                "price": 29.0, "stock": 5, "lowStockAt": 2, "sku": "INTERNAL-SKU-42",
                "cost": 4.0, "commissionPct": 75, "sold30d": 9999, "views30d": 4567,
                "status": "approved", "reviewStatus": "approved", "reviewNote": "internal moderation",
                "owner_type": "seller", "channels": {"marketplace": True, "store": False},
                "variants": [{"name": "Color", "values": ["Blue"], "supplierCode": "PRIVATE-SUPPLIER"}],
                "images": [], "createdAt": "2026-10-01T00:00:00+00:00",
            }
            db.add(User(id=user_id, name="Private Review Shopper", email=email,
                        password_hash=hash_password("Isolated-Test-Password-123!"), settings={}))
            put_row(db, "product", slug, product)
            db.add(Review(id=review_id, user_id=user_id, product_id=product_id, data={
                "rating": 5, "title": "Great", "body": "Works well", "createdAt": "2026-10-10T00:00:00+00:00",
                "verifiedPurchase": True, "helpful": 2, "userId": user_id, "email": email,
                "phone": "+10000000000", "address": "Private address",
            }))
            db.commit()
        try:
            response = self.client.get("/catalog/product", params={"slug": slug})
            self.assertEqual(response.status_code, 200, response.text)
            payload = response.json()
            public_product = payload["product"]
            for private_field in ("sku", "cost", "stock", "sold30d", "views30d", "commissionPct",
                                  "status", "reviewStatus", "reviewNote", "owner_type", "channels"):
                self.assertNotIn(private_field, public_product)
            self.assertEqual(public_product["stockStatus"], "in_stock")
            self.assertEqual(public_product["rating"], 5.0)
            self.assertEqual(public_product["reviewCount"], 1)
            self.assertEqual(public_product["variants"], [{"name": "Color", "values": ["Blue"]}])
            self.assertEqual(len(payload["reviews"]), 1)
            review = payload["reviews"][0]
            self.assertEqual(review["author"], "Verified buyer")
            for private_field in ("userId", "email", "phone", "address", "user_id"):
                self.assertNotIn(private_field, review)
            self.assertNotIn(email, json.dumps(payload))
            self.assertNotIn("PRIVATE-SUPPLIER", json.dumps(payload))
            self.assertNotIn("INTERNAL-SKU-42", json.dumps(payload))
            self.assertNotIn("website", payload["merchant"])
            self.assertNotIn("customDomain", payload["merchant"])

            seller_page = self.client.get("/catalog/store", params={"slug": "abc-electronics"})
            self.assertEqual(seller_page.status_code, 200, seller_page.text)
            listed = next(item for item in seller_page.json()["products"] if item["id"] == product_id)
            self.assertNotIn("cost", listed)
            self.assertNotIn("sku", listed)
        finally:
            with SessionLocal() as db:
                db.query(Review).filter_by(id=review_id).delete(synchronize_session=False)
                db.query(User).filter_by(id=user_id).delete(synchronize_session=False)
                drop_row(db, "product", slug)
                db.commit()

    def test_orders_are_marketplace_only_and_financials_require_paid_states(self):
        suffix = uuid.uuid4().hex[:10]
        user_id = f"usr_orders_{suffix}"
        email = f"orders-{suffix}@example.com"
        order_ids = [f"ord_market_{suffix}", f"ord_store_{suffix}", f"ord_pending_{suffix}", f"ord_unknown_{suffix}"]
        baseline_orders = self.client.get("/admin/orders", headers={"X-Ferix-Session": self.admin}).json()["gmv"]
        baseline_payments = self.client.get("/admin/payments", headers={"X-Ferix-Session": self.admin}).json()["totals"]["gross"]
        baseline_overview = self.client.get("/admin/overview", headers={"X-Ferix-Session": self.admin}).json()["totals"]["gmv"]
        baseline_analytics = self.client.get("/admin/analytics", headers={"X-Ferix-Session": self.admin}).json()["totals"]["gmv"]
        baseline_payout_ids = {p["id"] for p in self.client.get("/admin/payouts", headers={"X-Ferix-Session": self.admin}).json()["payouts"]}
        with SessionLocal() as db:
            merchant = find_merchant(db, "abc-electronics")
            product = self.client.get("/merchant/products", headers={"X-Ferix-Session": self.merchant}).json()["items"][0]
            db.add(User(id=user_id, name="Marketplace Test Shopper", email=email,
                        password_hash=hash_password("Isolated-Test-Password-123!"), settings={}))
            shared_item = {"productId": product["id"], "merchantId": merchant["id"],
                           "title": "Order Isolation Listing", "price": 100.0, "qty": 1}
            for order_id, channel, payment, fulfillment, total in (
                (order_ids[0], "marketplace", "paid", "delivered", 100.0),
                (order_ids[1], "store", "paid", "delivered", 900.0),
                (order_ids[2], "marketplace", "pending", "processing", 500.0),
                (order_ids[3], None, "paid", "delivered", 700.0),
            ):
                order_data = {
                    "id": order_id, "number": order_id, "payment": payment,
                    "fulfillment": fulfillment, "placedAt": "2026-10-10T08:00:00+00:00",
                    "subtotal": total, "shipping": 0, "tax": 0, "total": total,
                    "items": [{**shared_item, "price": total}], "address": {"country": "Testland"},
                }
                if channel is not None:
                    order_data["channel"] = channel
                db.add(Order(id=order_id, user_id=user_id, data=order_data))
            db.commit()
        try:
            login = self.client.post("/auth/login", json={"email": email, "password": "Isolated-Test-Password-123!"})
            self.assertEqual(login.status_code, 200, login.text)
            shopper = login.json()["token"]

            account = self.client.get("/account/orders", headers={"X-Ferix-Session": shopper})
            self.assertEqual(account.status_code, 200, account.text)
            self.assertEqual({o["id"] for o in account.json()["orders"]}, {order_ids[0], order_ids[2]})
            account_summary = self.client.get("/account", headers={"X-Ferix-Session": shopper}).json()
            self.assertEqual(account_summary["stats"]["spent"], 100.0)
            self.assertEqual(account_summary["stats"]["averageOrder"], 100.0)
            self.assertEqual(self.client.get("/account/orders/detail", headers={"X-Ferix-Session": shopper},
                                            params={"orderId": order_ids[1]}).status_code, 404)
            self.assertEqual(self.client.get("/account/orders/detail", headers={"X-Ferix-Session": shopper},
                                            params={"orderId": order_ids[3]}).status_code, 404)
            self.assertEqual(self.client.post("/account/orders/reorder", headers={"X-Ferix-Session": shopper},
                                              json={"orderId": order_ids[1]}).status_code, 404)

            seller_customers = self.client.get("/merchant/customers", headers={"X-Ferix-Session": self.merchant},
                                               params={"search": email})
            self.assertEqual(seller_customers.status_code, 200, seller_customers.text)
            self.assertEqual(seller_customers.json()["total"], 1)
            self.assertEqual(seller_customers.json()["customers"][0]["email"], email)
            self.assertEqual(seller_customers.json()["customers"][0]["orders"], 1)
            self.assertEqual(seller_customers.json()["customers"][0]["spent"], 100.0)
            inventory = self.client.get("/merchant/inventory", headers={"X-Ferix-Session": self.merchant})
            self.assertEqual(inventory.status_code, 200, inventory.text)
            inventory_product = next(row for row in inventory.json()["rows"] if row["id"] == product["id"])
            self.assertEqual(inventory_product["reserved"], 0)

            admin_orders = self.client.get("/admin/orders", headers={"X-Ferix-Session": self.admin})
            self.assertEqual(admin_orders.status_code, 200, admin_orders.text)
            rows = admin_orders.json()["orders"]
            self.assertEqual({o["id"] for o in rows if o["id"] in order_ids}, {order_ids[0], order_ids[2]})
            self.assertTrue(all(o["channel"] == "marketplace" for o in rows))
            self.assertEqual(admin_orders.json()["gmv"] - baseline_orders, 100.0)
            overview = self.client.get("/admin/overview", headers={"X-Ferix-Session": self.admin}).json()
            analytics = self.client.get("/admin/analytics", headers={"X-Ferix-Session": self.admin}).json()
            self.assertEqual(overview["totals"]["gmv"] - baseline_overview, 100.0)
            self.assertEqual(analytics["totals"]["gmv"] - baseline_analytics, 100.0)
            self.assertEqual(overview["channels"], {"marketplace": overview["totals"]["gmv"]})
            self.assertEqual(self.client.get("/admin/orders", headers={"X-Ferix-Session": self.admin},
                                             params={"channel": "store"}).status_code, 400)

            payments = self.client.get("/admin/payments", headers={"X-Ferix-Session": self.admin})
            self.assertEqual(payments.status_code, 200, payments.text)
            visible_transactions = {o["orderId"] for o in payments.json()["transactions"]}
            self.assertEqual(visible_transactions & set(order_ids), {order_ids[0]})
            self.assertEqual(payments.json()["totals"]["gross"] - baseline_payments, 100.0)
            self.assertNotIn("store", analytics["byChannel"])
            payout_list = self.client.get("/admin/payouts", headers={"X-Ferix-Session": self.admin})
            self.assertEqual(payout_list.status_code, 200, payout_list.text)
            self.assertEqual({p["id"] for p in payout_list.json()["payouts"]}, baseline_payout_ids)
            self.assertEqual(self.client.patch("/admin/payouts", headers={"X-Ferix-Session": self.admin},
                                               json={"id": f"pay_{suffix}", "status": "paid"}).status_code, 409)

            self.assertEqual(self.client.post("/admin/order/refund", headers={"X-Ferix-Session": self.admin},
                                              json={"id": order_ids[0]}).status_code, 409)
            self.assertEqual(self.client.post("/admin/order/cancel", headers={"X-Ferix-Session": self.admin},
                                              json={"id": order_ids[0]}).status_code, 409)
            self.assertEqual(self.client.post("/admin/order/cancel", headers={"X-Ferix-Session": self.admin},
                                              json={"id": order_ids[1]}).status_code, 404)
        finally:
            with SessionLocal() as db:
                db.query(Order).filter(Order.id.in_(order_ids)).delete(synchronize_session=False)
                db.query(SessionToken).filter_by(user_id=user_id).delete(synchronize_session=False)
                db.query(User).filter_by(id=user_id).delete(synchronize_session=False)
                db.commit()

    def test_admin_merchant_detail_uses_seller_lines_and_survives_malformed_order_json(self):
        suffix = uuid.uuid4().hex[:10]
        user_id = f"usr_detail_{suffix}"
        email = f"detail-{suffix}@example.com"
        mixed_id = f"ord_mixed_{suffix}"
        malformed_id = f"ord_bad_json_{suffix}"
        baseline = self.client.get("/admin/merchant", headers={"X-Ferix-Session": self.admin},
                                   params={"id": "abc-electronics"})
        self.assertEqual(baseline.status_code, 200, baseline.text)
        with SessionLocal() as db:
            merchant_a = find_merchant(db, "abc-electronics")
            merchant_b = find_merchant(db, "aurasound")
            product_a = self.client.get("/merchant/products", headers={"X-Ferix-Session": self.merchant}).json()["items"][0]
            db.add(User(id=user_id, name="Mixed Order Shopper", email=email,
                        password_hash=hash_password("Isolated-Test-Password-123!"), settings={}))
            db.add(Order(id=mixed_id, user_id=user_id, data={
                "id": mixed_id, "number": mixed_id, "channel": "marketplace", "payment": "paid",
                "fulfillment": "delivered", "placedAt": "2026-10-10T08:00:00+00:00",
                "subtotal": 1000, "total": 1000, "items": [
                    {"productId": product_a["id"], "merchantId": merchant_a["id"], "title": "Seller A", "price": 100, "qty": 1},
                    {"productId": "product-other-seller", "merchantId": merchant_b["id"], "title": "Seller B", "price": 900, "qty": 1},
                ],
            }))
            db.add(Order(id=malformed_id, user_id=user_id, data={
                "id": malformed_id, "number": malformed_id, "channel": "marketplace", "payment": "pending",
                "fulfillment": "processing", "items": ["not-an-item", None],
            }))
            db.commit()
        try:
            detail = self.client.get("/admin/merchant", headers={"X-Ferix-Session": self.admin},
                                     params={"id": "abc-electronics"})
            self.assertEqual(detail.status_code, 200, detail.text)
            payload = detail.json()
            before = baseline.json()["summary"]
            after = payload["summary"]
            self.assertEqual(after["revenueTotal"] - before["revenueTotal"], 100)
            self.assertEqual(after["revenue30d"] - before["revenue30d"], 100)
            self.assertEqual(after["ordersTotal"] - before["ordersTotal"], 1)
            rate = float(payload["merchant"]["commissionPct"])
            self.assertAlmostEqual(after["commission30d"] - before["commission30d"], rate)
            row = next(order for order in payload["orders"] if order["id"] == mixed_id)
            self.assertEqual(row["sellerGross"], 100)
            self.assertAlmostEqual(row["sellerCommission"], rate)
            admin_orders = self.client.get("/admin/orders", headers={"X-Ferix-Session": self.admin})
            self.assertEqual(admin_orders.status_code, 200, admin_orders.text)
            malformed = next(order for order in admin_orders.json()["orders"] if order["id"] == malformed_id)
            self.assertEqual(malformed["items"], [])
            invalid_status = self.client.patch("/admin/merchant", headers={"X-Ferix-Session": self.admin},
                                               json={"id": "abc-electronics", "status": "inactive"})
            self.assertEqual(invalid_status.status_code, 422, invalid_status.text)
            direct_profile_edit = self.client.patch("/admin/merchant", headers={"X-Ferix-Session": self.admin}, json={
                "id": "abc-electronics", "name": "Must remain seller-owned", "location": "Must remain seller-owned",
            })
            self.assertEqual(direct_profile_edit.status_code, 422, direct_profile_edit.text)
            unchanged = self.client.get("/admin/merchant", headers={"X-Ferix-Session": self.admin},
                                        params={"id": "abc-electronics"}).json()
            self.assertEqual(unchanged["profile"]["name"], baseline.json()["profile"]["name"])
        finally:
            with SessionLocal() as db:
                db.query(Order).filter(Order.id.in_([mixed_id, malformed_id])).delete(synchronize_session=False)
                db.query(SessionToken).filter_by(user_id=user_id).delete(synchronize_session=False)
                db.query(User).filter_by(id=user_id).delete(synchronize_session=False)
                db.commit()

    def test_admin_seller_product_management_is_scoped_and_preserves_history(self):
        suffix = uuid.uuid4().hex[:10]
        with SessionLocal() as lookup_db:
            seller_id = find_merchant(lookup_db, "abc-electronics")["id"]
            other_seller_id = find_merchant(lookup_db, "aurasound")["id"]
        user_id = f"usr_manage_{suffix}"
        email = f"manage-{suffix}@example.com"
        product_specs = [
            (f"prod_manage_{suffix}", f"admin-managed-{suffix}", seller_id, "approved"),
            (f"prod_delete_{suffix}", f"admin-delete-{suffix}", seller_id, "approved"),
            (f"prod_pending_{suffix}", f"admin-pending-{suffix}", seller_id, "pending_review"),
            (f"prod_other_{suffix}", f"admin-other-{suffix}", other_seller_id, "approved"),
        ]
        order_id = f"ord_manage_{suffix}"
        with SessionLocal() as db:
            merchant = find_merchant(db, "abc-electronics")
            categories = __import__("core").categories(db)
            category = categories[0]["slug"]
            for product_id, slug, owner_id, status in product_specs:
                owner = find_merchant(db, owner_id)
                put_row(db, "product", slug, {
                    "id": product_id, "slug": slug, "title": f"Listing {product_id}",
                    "merchantId": owner_id, "merchantName": owner["name"], "merchantSlug": owner["slug"],
                    "origin": "seller", "owner_type": "seller", "category": category,
                    "description": "Initial description", "price": 25.0, "stock": 5,
                    "status": status, "channels": {"marketplace": True, "store": False},
                    "images": [], "collections": [], "tags": [], "featured": False,
                })
            db.add(User(id=user_id, name="Product Management Shopper", email=email,
                        password_hash=hash_password("Isolated-Test-Password-123!"), settings={}))
            db.add(Order(id=order_id, user_id=user_id, data={
                "id": order_id, "channel": "marketplace", "payment": "paid", "fulfillment": "delivered",
                "placedAt": "2026-10-10T08:00:00+00:00", "items": [
                    {"productId": product_specs[0][0], "merchantId": seller_id, "price": 25, "qty": 1},
                ],
            }))
            db.commit()
        try:
            product_id, slug = product_specs[0][0], product_specs[0][1]
            scope_violation = self.client.patch("/admin/merchant/product", headers={"X-Ferix-Session": self.admin}, json={
                "merchantId": seller_id, "productId": product_specs[3][0], "title": "Cross-seller edit",
            })
            self.assertEqual(scope_violation.status_code, 404, scope_violation.text)
            pending_edit = self.client.patch("/admin/merchant/product", headers={"X-Ferix-Session": self.admin}, json={
                "merchantId": seller_id, "productId": product_specs[2][0], "title": "Skip review",
            })
            self.assertEqual(pending_edit.status_code, 409, pending_edit.text)
            updated = self.client.patch("/admin/merchant/product", headers={"X-Ferix-Session": self.admin}, json={
                "merchantId": seller_id, "productId": product_id, "title": "Admin corrected listing",
                "description": "Corrected by Admin", "price": 31.5, "stock": 8,
                "category": category, "marketplace": False, "featured": True,
            })
            self.assertEqual(updated.status_code, 200, updated.text)
            self.assertFalse(updated.json()["product"]["channels"]["marketplace"])
            self.assertFalse(updated.json()["product"]["featured"])
            self.assertEqual(self.client.get("/catalog/product", params={"slug": slug}).status_code, 404)
            enabled = self.client.patch("/admin/merchant/product", headers={"X-Ferix-Session": self.admin}, json={
                "merchantId": seller_id, "productId": product_id, "marketplace": True, "featured": True,
            })
            self.assertEqual(enabled.status_code, 200, enabled.text)
            self.assertIn(product_id, {p["id"] for p in self.client.get("/catalog/home").json()["featured"]})

            removed = self.client.request("DELETE", "/admin/merchant/product", headers={"X-Ferix-Session": self.admin},
                                          json={"merchantId": seller_id, "productId": product_id})
            self.assertEqual(removed.status_code, 200, removed.text)
            self.assertTrue(removed.json()["archived"])
            self.assertEqual(self.client.get("/catalog/product", params={"slug": slug}).status_code, 404)
            restored = self.client.post("/admin/merchant/product/restore", headers={"X-Ferix-Session": self.admin},
                                        json={"merchantId": seller_id, "productId": product_id})
            self.assertEqual(restored.status_code, 200, restored.text)
            self.assertEqual(restored.json()["product"]["status"], "approved")
            self.assertTrue(restored.json()["product"]["channels"]["marketplace"])
            self.assertTrue(restored.json()["product"]["featured"])

            no_history_id, no_history_slug = product_specs[1][0], product_specs[1][1]
            permanent = self.client.request("DELETE", "/admin/merchant/product", headers={"X-Ferix-Session": self.admin},
                                            json={"merchantId": seller_id, "productId": no_history_id})
            self.assertEqual(permanent.status_code, 200, permanent.text)
            self.assertFalse(permanent.json()["archived"])
            self.assertEqual(self.client.get("/catalog/product", params={"slug": no_history_slug}).status_code, 404)
            detail = self.client.get("/admin/merchant", headers={"X-Ferix-Session": self.admin}, params={"id": seller_id})
            self.assertEqual(detail.status_code, 200, detail.text)
            self.assertIn(product_id, {product["id"] for product in detail.json()["catalog"]})
            self.assertNotIn(no_history_id, {product["id"] for product in detail.json()["catalog"]})
        finally:
            with SessionLocal() as db:
                db.query(Order).filter_by(id=order_id).delete(synchronize_session=False)
                db.query(SessionToken).filter_by(user_id=user_id).delete(synchronize_session=False)
                db.query(User).filter_by(id=user_id).delete(synchronize_session=False)
                for _, slug, _, _ in product_specs:
                    drop_row(db, "product", slug)
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
            saved_again = self.client.patch("/admin/cms/document", headers={"X-Ferix-Session": self.admin}, json={
                "id": document_id, "data": {"sections": [
                    {"id": "hero", "visible": False}, {"id": "products", "title": "Keep section"},
                ]},
                "note": "Second contract save",
            })
            self.assertEqual(saved_again.status_code, 200, saved_again.text)
            latest = saved_again.json()["document"]["data"]
            self.assertEqual(latest["sections"][0]["title"], "New title")
            self.assertFalse(latest["sections"][0]["visible"])
            self.assertEqual(latest["sections"][0]["heroConfig"], {"scrim": 75, "align": "right"})
            self.assertEqual(len(latest["sections"]), 2)
            with SessionLocal() as db:
                live = db.get(ContentDocument, document_id)
                self.assertEqual(live.data["sections"][0]["title"], "Old title")
                self.assertEqual(db.query(ContentVersion).filter_by(document_id=document_id, status="draft").count(), 1)
                self.assertEqual(db.query(ContentVersion).filter_by(document_id=document_id, status="superseded").count(), 1)
            published = self.client.post("/admin/cms/document/publish", headers={"X-Ferix-Session": self.admin}, json={"id": document_id})
            self.assertEqual(published.status_code, 200, published.text)
            self.assertEqual(published.json()["document"]["data"]["sections"][0]["title"], "New title")
            with SessionLocal() as db:
                self.assertEqual(db.query(ContentVersion).filter_by(document_id=document_id, status="draft").count(), 0)
        finally:
            with SessionLocal() as db:
                db.query(ContentVersion).filter_by(document_id=document_id).delete()
                doc = db.get(ContentDocument, document_id)
                if doc:
                    db.delete(doc)
                db.commit()


if __name__ == "__main__":
    unittest.main()
