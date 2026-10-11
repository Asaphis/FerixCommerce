"""
Safe schema migration script for Ferixas Commerce.
Creates tables and adds new columns to the catalog_records table if they do not already exist.
"""
import os
import sys
sys.path.insert(0, ".")

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if not DATABASE_URL:
    raise SystemExit("DATABASE_URL must be configured for the hosted PostgreSQL database.")

from sqlalchemy import create_engine, text, inspect
SCHEMA_VERSION = 2
from core import Base

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)

NEW_COLUMNS = {
    "status": "VARCHAR(30)",
    "owner_type": "VARCHAR(20)",
    "rejection_reason": "TEXT",
    "shipping_amount": "FLOAT",
    "estimated_delivery_days": "INTEGER",
    "package_weight": "FLOAT",
    "package_dimensions": "VARCHAR(100)",
    "shipping_origin": "VARCHAR(200)",
    "follower_count": "INTEGER DEFAULT 0",
    "total_reviews": "INTEGER DEFAULT 0",
    "average_rating": "FLOAT DEFAULT 0.0",
    "success_rate": "FLOAT DEFAULT 0.0",
    "delivery_rate": "FLOAT DEFAULT 0.0",
}

def run_migration():
    """Apply required columns atomically and fail closed on incompatible schemas."""
    Base.metadata.create_all(engine)
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE IF NOT EXISTS schema_versions (id VARCHAR(40) PRIMARY KEY, version INTEGER NOT NULL, applied_at TIMESTAMP NOT NULL)"))
        required = {
            "staff_sessions": {"last_seen_at": "TIMESTAMP"}, "sessions": {"last_seen_at": "TIMESTAMP"},
            "catalog_records": {name: typ for name, typ in NEW_COLUMNS.items()},
        }
        for table, columns in required.items():
            existing = {col["name"] for col in inspect(conn).get_columns(table)}
            for name, col_type in columns.items():
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {col_type}"))
        version = conn.execute(text("SELECT version FROM schema_versions WHERE id='current'")).scalar()
        if version is not None and int(version) > SCHEMA_VERSION:
            raise RuntimeError(f"Database schema version {version} is newer than application {SCHEMA_VERSION}")
        if version is None:
            conn.execute(text("INSERT INTO schema_versions (id, version, applied_at) VALUES ('current', :version, CURRENT_TIMESTAMP)"), {"version": SCHEMA_VERSION})
        elif int(version) < SCHEMA_VERSION:
            conn.execute(text("UPDATE schema_versions SET version=:version, applied_at=CURRENT_TIMESTAMP WHERE id='current'"), {"version": SCHEMA_VERSION})
    final = inspect(engine)
    for table, columns in required.items():
        names = {col["name"] for col in final.get_columns(table)}
        missing = set(columns) - names
        if missing:
            raise RuntimeError(f"Migration incomplete for {table}: {sorted(missing)}")
    print(f"Migration completed successfully at schema version {SCHEMA_VERSION}.")

if __name__ == "__main__":
    run_migration()
