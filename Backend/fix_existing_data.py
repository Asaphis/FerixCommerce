#!/usr/bin/env python3
"""Data migration script to fix existing products and ensure proper approval workflow.

This script:
1. Sets owner_type for all products (platform vs seller)
2. Ensures seller products have proper status fields
3. Validates marketplace channel tags
4. Reports on data state before and after migration

Run this once after deploying the new approval workflow.
"""

from core import SessionLocal, products, put_row


def migrate_products():
    """Fix existing products to match new approval workflow."""
    with SessionLocal() as db:
        all_products = products(db)
        
        stats = {
            "total": len(all_products),
            "platform_fixed": 0,
            "seller_fixed": 0,
            "status_fixed": 0,
            "channel_fixed": 0,
            "skipped": 0,
        }
        
        print(f"\n🔍 Found {stats['total']} products to analyze...\n")
        
        for product in all_products:
            slug = product.get("slug")
            merchant_id = product.get("merchantId", "")
            origin = product.get("origin")
            owner_type = product.get("owner_type")
            status = product.get("status")
            channels = product.get("channels") or {}
            
            needs_update = False
            updates = {}
            
            # Fix 1: Set owner_type based on merchantId or origin
            if not owner_type:
                if merchant_id == "ferixas-official" or origin == "platform":
                    updates["owner_type"] = "platform"
                    updates["origin"] = "platform"
                    stats["platform_fixed"] += 1
                    needs_update = True
                    print(f"  ✓ Setting platform ownership for: {product.get('title')}")
                elif merchant_id:
                    updates["owner_type"] = "seller"
                    updates["origin"] = "seller"
                    stats["seller_fixed"] += 1
                    needs_update = True
                    print(f"  ✓ Setting seller ownership for: {product.get('title')} (Merchant: {merchant_id})")
            
            # Fix 2: Ensure seller products have proper status
            if (owner_type == "seller" or updates.get("owner_type") == "seller"):
                if not status or status not in ["pending_review", "approved", "rejected", "draft", "archived"]:
                    # Default to approved for existing seller products (grandfather them in)
                    # New products will use pending_review
                    updates["status"] = "approved"
                    stats["status_fixed"] += 1
                    needs_update = True
                    print(f"  ✓ Setting status=approved for existing seller product: {product.get('title')}")
            
            # Fix 3: Validate marketplace channel for seller products
            if (owner_type == "seller" or updates.get("owner_type") == "seller"):
                if not channels.get("marketplace"):
                    channels["marketplace"] = True
                    updates["channels"] = channels
                    stats["channel_fixed"] += 1
                    needs_update = True
                    print(f"  ✓ Enabling marketplace channel for: {product.get('title')}")
            
            # Apply updates if needed
            if needs_update:
                updated_product = {**product, **updates}
                put_row(db, "product", slug, updated_product)
            else:
                stats["skipped"] += 1
        
        db.commit()
        
        # Print summary
        print("\n" + "="*60)
        print("📊 MIGRATION SUMMARY")
        print("="*60)
        print(f"  Total products processed: {stats['total']}")
        print(f"  Platform products fixed: {stats['platform_fixed']}")
        print(f"  Seller products fixed: {stats['seller_fixed']}")
        print(f"  Status fields fixed: {stats['status_fixed']}")
        print(f"  Channel tags fixed: {stats['channel_fixed']}")
        print(f"  Products skipped (no changes): {stats['skipped']}")
        print("="*60)
        print("\n✅ Migration completed successfully!\n")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("🚀 FERIXAS PRODUCT DATA MIGRATION")
    print("="*60)
    print("\nThis script will fix existing products to ensure proper approval workflow.")
    print("Existing seller products will be grandfathered in as 'approved'.")
    print("New seller products will require admin approval.\n")
    
    response = input("Continue with migration? (yes/no): ").strip().lower()
    
    if response in ["yes", "y"]:
        migrate_products()
    else:
        print("\n❌ Migration cancelled.\n")
