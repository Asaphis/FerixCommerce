"""Remove product placements whose section no longer exists.

    cd Backend
    set -a && source .env && set +a      # DATABASE_URL, as for the API
    python3 prune_orphans.py             # report only
    python3 prune_orphans.py --apply     # delete them

The same thing the Admin API exposes as POST /admin/cms/integrity/prune, for
running during a deploy when nobody wants to open a console.
"""
from __future__ import annotations

import argparse
import json
import sys

from core import (Base, SessionLocal, delete_orphan_placements, engine, migrate,
                  sync_all_sections)


def main() -> int:
    parser = argparse.ArgumentParser(description="Report or delete orphan section placements.")
    parser.add_argument("--apply", action="store_true", help="delete instead of reporting")
    args = parser.parse_args()

    Base.metadata.create_all(engine)
    migrate()
    with SessionLocal() as db:
        sync_all_sections(db)
        db.flush()
        result = delete_orphan_placements(db, dry_run=not args.apply)
        db.commit()

    print(json.dumps(result, indent=2, default=str))
    if not args.apply and result["count"]:
        print("\nNothing was deleted. Re-run with --apply to remove them.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
