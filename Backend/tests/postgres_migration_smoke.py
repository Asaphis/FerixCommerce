"""Disposable PostgreSQL smoke: fresh seed, legacy migration, and future-version refusal.

Run only against a local disposable database whose name starts ``ferixas_test_``:
    FERIXAS_TEST_POSTGRES_URL=postgresql+psycopg://.../ferixas_test_ci \
      python tests/postgres_migration_smoke.py

Each case gets a uniquely named schema; the script drops only those schemas afterward.
It refuses non-local hosts and non-prefixed database names.
"""
from __future__ import annotations

import os
import subprocess
import sys
import uuid

from sqlalchemy.engine import make_url


def main() -> int:
    raw_url = os.getenv("FERIXAS_TEST_POSTGRES_URL", "").strip()
    if not raw_url:
        raise SystemExit("Set FERIXAS_TEST_POSTGRES_URL to a disposable local PostgreSQL database URL.")
    url = make_url(raw_url)
    if not url.drivername.startswith("postgresql"):
        raise SystemExit("Refusing to run: the test URL must use PostgreSQL.")
    if url.host not in (None, "", "localhost", "127.0.0.1", "::1"):
        raise SystemExit("Refusing to run: the PostgreSQL host must be local.")
    if not (url.database or "").startswith("ferixas_test_"):
        raise SystemExit("Refusing to run: database name must start with ferixas_test_.")

    try:
        import psycopg
        from psycopg import sql
    except ImportError as error:
        raise SystemExit("Install Backend/requirements.txt to run PostgreSQL migration smoke tests.") from error

    psycopg_url = url.set(drivername="postgresql").render_as_string(hide_password=False)
    cases = {
        "fresh": r'''
from core import SessionLocal, ensure_seed, products, schema_ready
ensure_seed()
with SessionLocal() as db:
    first = products(db)
    assert first, "fresh database was not seeded"
    assert all(p.get("status") == "approved" for p in first), "seed listing is not approved"
    assert all((p.get("channels") or {}).get("marketplace") is True for p in first), "seed listing is not marketplace-enabled"
    assert all(p.get("demoListing") is True and p.get("reviewCount") == 0 and p.get("sold30d") == 0 for p in first), "demo proof was not neutralized"
    first_count = len(first)
ensure_seed()
with SessionLocal() as db:
    assert len(products(db)) == first_count, "repeated seeding changed the catalogue"
assert schema_ready(), "fresh schema is not ready"
print("fresh seed + idempotence: passed")
''',
        "legacy": r'''
from sqlalchemy import inspect, text
from core import engine, migrate, SCHEMA_VERSION
with engine.begin() as c:
    c.execute(text("CREATE TABLE schema_versions (id VARCHAR(40) PRIMARY KEY, version INTEGER NOT NULL, applied_at TIMESTAMP WITH TIME ZONE NOT NULL)"))
    c.execute(text("INSERT INTO schema_versions (id, version, applied_at) VALUES ('current', :v, CURRENT_TIMESTAMP)"), {"v": SCHEMA_VERSION - 1})
    c.execute(text("CREATE TABLE staff_sessions (token VARCHAR(96) PRIMARY KEY, staff_id VARCHAR(60), expires_at TIMESTAMP)"))
    c.execute(text("CREATE TABLE sessions (token VARCHAR(96) PRIMARY KEY, user_id VARCHAR(40), expires_at TIMESTAMP)"))
    c.execute(text("CREATE TABLE catalog_records (key VARCHAR(180) PRIMARY KEY, kind VARCHAR(30), slug VARCHAR(180), data JSON)"))
migrate()
inspector = inspect(engine)
assert "last_seen_at" in {c["name"] for c in inspector.get_columns("staff_sessions")}
assert "last_seen_at" in {c["name"] for c in inspector.get_columns("sessions")}
columns = {c["name"] for c in inspector.get_columns("catalog_records")}
assert {"status", "owner_type", "rejection_reason", "shipping_amount", "estimated_delivery_days", "package_weight", "package_dimensions", "shipping_origin"} <= columns
with engine.connect() as c:
    version = c.execute(text("SELECT version FROM schema_versions WHERE id='current'")).scalar_one()
assert version == SCHEMA_VERSION
print("legacy schema upgrade: passed")
''',
        "future": r'''
from sqlalchemy import text
from core import engine, migrate, SCHEMA_VERSION
with engine.begin() as c:
    c.execute(text("CREATE TABLE schema_versions (id VARCHAR(40) PRIMARY KEY, version INTEGER NOT NULL, applied_at TIMESTAMP WITH TIME ZONE NOT NULL)"))
    c.execute(text("INSERT INTO schema_versions (id, version, applied_at) VALUES ('current', :v, CURRENT_TIMESTAMP)"), {"v": SCHEMA_VERSION + 1})
    c.execute(text("CREATE TABLE staff_sessions (token VARCHAR(96) PRIMARY KEY, staff_id VARCHAR(60), expires_at TIMESTAMP)"))
    c.execute(text("CREATE TABLE sessions (token VARCHAR(96) PRIMARY KEY, user_id VARCHAR(40), expires_at TIMESTAMP)"))
    c.execute(text("CREATE TABLE catalog_records (key VARCHAR(180) PRIMARY KEY, kind VARCHAR(30), slug VARCHAR(180), data JSON)"))
try:
    migrate()
except RuntimeError as error:
    assert "newer than application" in str(error)
else:
    raise AssertionError("future schema version was not refused")
print("future schema refusal: passed")
''',
    }

    with psycopg.connect(psycopg_url, autocommit=True) as connection:
        for name, script in cases.items():
            schema = f"ferixas_test_{name}_{uuid.uuid4().hex[:10]}"
            connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
            scoped_url = url.update_query_dict({"options": f"-csearch_path={schema}"}).render_as_string(hide_password=False)
            environment = os.environ.copy()
            environment.update({
                "DATABASE_URL": scoped_url,
                "FERIXAS_ENV": "test",
                "FERIXAS_TEST_STAFF_PASSWORD": "",
            })
            try:
                subprocess.run([sys.executable, "-c", script], check=True, env=environment)
                print(f"{name} schema: {schema}")
            finally:
                connection.execute(sql.SQL("DROP SCHEMA IF EXISTS {} CASCADE").format(sql.Identifier(schema)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
