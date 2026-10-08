"""Create or change a platform operator.

Run this on the server, never from the app:

    python create_operator.py you@example.com --name "Your Name" --role owner

Nothing in the application can grant a role, which is deliberate: a platform
cannot be talked out of its own security by a request. An account is made here,
by someone with shell access, and the role is named explicitly. Changing an
existing owner's role needs --force, so full access cannot be dropped by a typo.
"""

import argparse
import getpass
import sys

from sqlalchemy import select

from core import (
    ROLE_PERMISSIONS,
    SessionLocal,
    StaffUser,
    ensure_seed,
    hash_password,
    new_id,
    permissions_for,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Create or change a platform operator.")
    parser.add_argument("email", help="the operator's email address")
    parser.add_argument("--name", default="", help="display name")
    parser.add_argument("--role", default="admin", choices=sorted(ROLE_PERMISSIONS),
                        help="owner grants everything; the others are limited")
    parser.add_argument("--password", default=None,
                        help="omit this and you will be prompted, which keeps it out of the shell history")
    parser.add_argument("--force", action="store_true",
                        help="required to change the role of an account that is already an owner")
    args = parser.parse_args()

    email = args.email.strip().lower()
    if "@" not in email:
        print("That does not look like an email address.")
        return 1

    password = args.password or getpass.getpass("Password (at least 8 characters): ")
    if len(password) < 8:
        print("Use at least 8 characters.")
        return 1

    # Creates the tables and runs the migrations first, so this works on a
    # database that has never been started.
    ensure_seed()

    with SessionLocal() as db:
        owner_count = len(db.scalars(
            select(StaffUser).where(StaffUser.subject_type == "admin", StaffUser.role == "owner")
        ).all())

        row = db.scalar(select(StaffUser).where(
            StaffUser.email == email, StaffUser.subject_type == "admin"))

        if row is None:
            row = StaffUser(
                id=new_id("stf"),
                subject_type="admin",
                subject_id="platform",
                name=args.name or email,
                email=email,
                password_hash=hash_password(password),
                role=args.role,
                permissions=permissions_for(args.role),
            )
            db.add(row)
            action = "created"
        else:
            if row.role == "owner" and args.role != "owner" and owner_count <= 1 and not args.force:
                print(f"{email} is the only owner. Pass --force if that is really what you want.")
                return 1
            row.role = args.role
            row.permissions = permissions_for(args.role)
            row.password_hash = hash_password(password)
            if args.name:
                row.name = args.name
            action = "updated"

        db.commit()
        print(f"{action}: {row.email}")
        print(f"  name        {row.name}")
        print(f"  role        {row.role}")
        print(f"  permissions {row.permissions}")
        print(f"  operators   {owner_count + (1 if action == 'created' and row.role == 'owner' else 0)} owner(s) on this platform")
    return 0


if __name__ == "__main__":
    sys.exit(main())
