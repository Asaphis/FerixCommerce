"""Replace the demonstration content with content you own.

The storefront never had anything hardcoded: every product, store, department and brand is
read from the database through the API. What the seed put in that database is demonstration
content, and this is how it is replaced rather than lived with.

    python seed_real.py                       what is there now, and who owns it
    python seed_real.py --clear-demo          remove the seeded demonstration stores
    python seed_real.py --ours 6              seed six products for the platform's own store
    python seed_real.py --store you@mail.com --products 4
                                              seed products under a store account you made
    python seed_real.py --remove --tag demo   remove everything this script created

Anything it creates is tagged, so it can be taken out again without touching real work.
"""

import argparse
import sys

from sqlalchemy import select

from core import (
    ROLE_PERMISSIONS,
    SessionLocal,
    StaffUser,
    ensure_seed,
    find_merchant,
    inventory_rows,
    new_id,
    now,
    put_row,
    rows_of,
    store_order,
)

# The stores the seed invents. Removing them by name is honest about what they are.
DEMO_STORES = [
    "aurasound", "abc-electronics", "nova-fashion", "pixel-gaming",
    "lumen-home", "sahel-supply", "verdant-beauty",
]
OURS = "ferixas-official"

TAG = "demo"


def report(db) -> None:
    merchants = sorted(rows_of(db, "merchant"), key=lambda m: m.get("name", ""))
    products = rows_of(db, "product")
    print(f"{len(merchants)} stores, {len(products)} products\n")
    for merchant in merchants:
        owned = [p for p in products if p.get("merchantId") == merchant["id"]]
        kind = "the platform" if merchant["slug"] == OURS else (
            "a seeded demonstration store" if merchant["slug"] in DEMO_STORES else "yours")
        print(f"  {merchant.get('name','?'):26s} {merchant['slug']:20s} {len(owned):3d} products   {kind}")
        for product in owned[:3]:
            mark = "  [demo]" if (product.get("seedTag") == TAG) else ""
            print(f"      {product.get('title','?')[:44]:46s} ${product.get('price', 0)}{mark}")
        if len(owned) > 3:
            print(f"      ... and {len(owned) - 3} more")


def clear_demo(db) -> int:
    """Remove the stores the seed invented, and everything that belonged only to them."""
    removed_stores = removed_products = 0
    for merchant in list(rows_of(db, "merchant")):
        if merchant["slug"] not in DEMO_STORES:
            continue
        for product in list(rows_of(db, "product")):
            if product.get("merchantId") == merchant["id"]:
                # An order that names this product keeps its own copy of the title and price,
                # so removing the listing does not rewrite anybody's history.
                from core import drop_row

                drop_row(db, "product", product["slug"])
                removed_products += 1
        from core import drop_row

        drop_row(db, "merchant", merchant["slug"])
        removed_stores += 1
        print(f"  removed store  {merchant.get('name')}")
    return removed_stores, removed_products


def make_product(db, merchant: dict, index: int, tag: str) -> dict:
    """One product belonging to a store, written the same way the API writes one."""
    slug = f"{merchant['slug']}-{tag}-{index}"
    product = {
        "id": f"prd_{slug}",
        "slug": slug,
        "title": f"{merchant.get('name', 'Store')} product {index}",
        "description": f"A listing under {merchant.get('name','this store')}, editable from the seller's own page.",
        "sku": f"{merchant['slug'][:3].upper()}-{100 + index}",
        "price": round(19.0 + index * 11, 2),
        "compareAt": round(29.0 + index * 11, 2),
        "stock": 25 + index * 5,
        "lowStockAt": 5,
        "category": "electronics",
        "merchantId": merchant["id"],
        "merchantSlug": merchant["slug"],
        "merchantName": merchant.get("name", ""),
        "images": [],
        "status": "active",
        "channels": {"store": True, "marketplace": True},
        "seedTag": tag,
        "createdAt": now().isoformat(),
        "updatedAt": now().isoformat(),
    }
    put_row(db, "product", slug, product)
    return product


def main() -> int:
    parser = argparse.ArgumentParser(description="Replace demonstration content with your own.")
    parser.add_argument("--clear-demo", action="store_true", help="remove the seeded demonstration stores")
    parser.add_argument("--ours", type=int, default=0, help="products to seed for the platform's own store")
    parser.add_argument("--store", default="", help="a store account email to seed products under")
    parser.add_argument("--products", type=int, default=0, help="how many products for that store")
    parser.add_argument("--remove", action="store_true", help="remove everything this script created")
    args = parser.parse_args()

    ensure_seed()

    with SessionLocal() as db:
        if args.clear_demo:
            stores, products = clear_demo(db)
            db.commit()
            print(f"cleared {stores} demonstration stores and {products} of their products\n")

        if args.remove:
            gone = 0
            from core import drop_row

            for product in list(rows_of(db, "product")):
                if product.get("seedTag") == TAG:
                    drop_row(db, "product", product["slug"])
                    gone += 1
            db.commit()
            print(f"removed {gone} products this script created\n")

        if args.ours:
            ours = next((m for m in rows_of(db, "merchant") if m["slug"] == OURS), None)
            if not ours:
                print(f"No platform store found at {OURS}. Seed one first."); return 1
            for index in range(1, args.ours + 1):
                make_product(db, ours, index, TAG)
            db.commit()
            print(f"seeded {args.ours} products for {ours.get('name')}\n")

        if args.store and args.products:
            account = db.scalar(select(StaffUser).where(
                StaffUser.email == args.store.strip().lower(), StaffUser.subject_type == "merchant"))
            if not account:
                print(f"No store account found for {args.store}.")
                print("Create the store first, then run this again - the store has to exist before it can hold products.")
                return 1
            merchant = find_merchant(db, account.subject_id)
            if not merchant:
                print(f"That account exists but its store does not. Contact support."); return 1
            for index in range(1, args.products + 1):
                make_product(db, merchant, index, TAG)
            db.commit()
            print(f"seeded {args.products} products under {merchant.get('name')}\n")

        report(db)
    return 0


if __name__ == "__main__":
    sys.exit(main())
