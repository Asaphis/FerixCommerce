# Ferixas Commerce - Product Approval System Implementation

## Date: 2026-10-09
## Status: IN PROGRESS

---

## Executive Summary

After thorough code analysis, I found that **the system architecture is mostly correct**, but missing key enforcement and approval workflow endpoints. The database schema is perfect and already includes all needed fields.

---

## What Was Already Working ✅

1. **Merchant product creation** - Line 505 of `merchant.py` correctly sets `status = "pending_review"`
2. **Product edit reverts to pending** - Line 535-537 reverts edited products to `pending_review`
3. **Public marketplace filtering** - Line 406 of `app.py` only shows `approved` products
4. **Database schema** - `Catalog` table has all required fields (status, owner_type, rejection_reason, shipping fields, seller profile fields)
5. **Data merge** - Line 822 of `core.py` merges data to prevent wipeout bug

---

## Critical Gaps Found 🚨

### 1. Missing Admin Approval Workflow
No endpoints exist for:
- `GET /admin/products/pending` - Get review queue
- `PATCH /admin/products/{id}/approve` - Approve product
- `PATCH /admin/products/{id}/reject` - Reject with reason

### 2. No Catalog Isolation
Admin sees ALL products (platform + seller) instead of:
- Admin catalog: only `owner_type = "platform"` products
- Seller catalog: only their own products

### 3. No Channel Enforcement
Sellers can create products without tagging marketplace or store channels. Since they don't have websites yet, marketplace must be required.

### 4. Missing Public Features
- No `/sellers/{id}` public profile page
- No follow/unfollow API endpoints (database field exists)

### 5. Category/Brand Control
Sellers might be able to create categories/brands instead of only selecting from admin-created ones.

---

## Implementation Plan

### Phase 1: Core Helper Functions ✅ READY TO IMPLEMENT
Add to `Backend/core.py`:
```python
def approved_products(db: Session) -> list[dict]:
    """Only approved products for public display."""
    return [p for p in products(db) if p.get("status") == "approved"]

def platform_products(db: Session) -> list[dict]:
    """Only platform-owned products for admin catalog."""
    return [p for p in products(db) if p.get("origin") == "platform" or p.get("owner_type") == "platform"]

def seller_products(db: Session, merchant_id: str) -> list[dict]:
    """Only products owned by specific seller."""
    return [p for p in products(db) if p.get("merchantId") == merchant_id]

def pending_products(db: Session) -> list[dict]:
    """All products pending review (for admin queue)."""
    return [p for p in products(db) if p.get("status") == "pending_review"]
```

### Phase 2: Admin Approval Endpoints ✅ READY TO IMPLEMENT
Add to `Backend/routers/admin.py`:
```python
@router.get("/products/pending")
def pending_review_queue(...):
    # Return all products with status = "pending_review"
    # Include merchant info, submission date, shipping details

@router.patch("/products/approve")
def approve_product(...):
    # Set status = "approved"
    # Log audit trail
    # Notify seller

@router.patch("/products/reject")
def reject_product(...):
    # Set status = "rejected"
    # Store rejection_reason
    # Log audit trail
    # Notify seller
```

### Phase 3: Marketplace Channel Validation ✅ READY TO IMPLEMENT
Update `Backend/routers/merchant.py` line 486:
```python
if not payload.marketplace and not payload.store:
    raise HTTPException(400, "Product must be tagged for at least one channel (marketplace or store)")

# Since sellers don't have websites yet, enforce marketplace:
if not payload.marketplace:
    raise HTTPException(400, "Products must be tagged to Marketplace until your store website is ready")
```

### Phase 4: Public Seller Profile ✅ READY TO IMPLEMENT
Add to `Backend/app.py`:
```python
@app.get("/sellers/{merchant_id}")
def seller_profile(merchant_id: str):
    # Return seller details + only APPROVED products owned by this seller
    # Include follower_count, ratings, delivery_rate

@app.post("/sellers/{merchant_id}/follow")
def follow_seller(merchant_id: str, ...):
    # Increment follower_count in Catalog table
    # Track follower in new SellerFollower table (or User.followed_sellers JSON)

@app.delete("/sellers/{merchant_id}/follow")
def unfollow_seller(merchant_id: str, ...):
    # Decrement follower_count
```

### Phase 5: Data Migration Script ✅ READY TO IMPLEMENT
Create `Backend/fix_existing_data.py`:
```python
# Fix any existing products:
# 1. Set owner_type = "platform" for admin-uploaded products
# 2. Set owner_type = "seller" for merchant-uploaded products  
# 3. Ensure all seller products have status set
# 4. Validate marketplace channel tags
```

---

## Testing Checklist

After implementation:
- [ ] Seller uploads product → status = "pending_review" → NOT visible on public marketplace
- [ ] Admin views pending queue → sees seller product
- [ ] Admin approves product → status = "approved" → NOW visible on public marketplace
- [ ] Admin rejects product → seller sees rejection reason in dashboard
- [ ] Seller edits approved product → reverts to "pending_review"
- [ ] Public `/sellers/{id}` page shows only approved products for that seller
- [ ] Platform products and seller products are isolated in admin catalog
- [ ] Seller cannot create product without marketplace tag
- [ ] Follow/unfollow increments/decrements follower_count

---

## Next Steps

1. Implement helper functions in core.py
2. Add admin approval endpoints
3. Add validation to merchant product creation
4. Add public seller profile & follow endpoints
5. Create and run data migration script
6. Test all workflows
7. Commit and push to GitHub

---

## Estimated Lines of Code
- Core helpers: ~50 lines
- Admin endpoints: ~150 lines  
- Merchant validation: ~10 lines
- Public endpoints: ~100 lines
- Migration script: ~80 lines
**Total: ~390 lines of new/modified code**

---

## Notes

The previous AI was correct in identifying the architecture, but failed to complete the implementation due to credit limits. The system design is sound - we just need to add the missing workflow endpoints and enforce the business rules.
