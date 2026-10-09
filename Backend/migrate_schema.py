"""
Safe schema migration script for Ferixas Commerce.
Creates tables and adds new columns to the catalog_records table if they do not already exist.
"""
import os
import sys
sys.path.insert(0, ".")

from sqlalchemy import create_engine, text, inspect
from core import Base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ferixas-dev.db")
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
    print("Creating tables if they don't exist...")
    Base.metadata.create_all(engine)
    print("Tables created/verified.")
    
    with engine.connect() as conn:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        if "catalog_records" not in tables:
            print("catalog_records table not found after create_all. This is unexpected.")
            return
            
        existing_columns = {col["name"] for col in inspector.get_columns("catalog_records")}
        
        for col_name, col_type in NEW_COLUMNS.items():
            if col_name not in existing_columns:
                print(f"Adding column: {col_name} ({col_type})")
                alter_stmt = f"ALTER TABLE catalog_records ADD COLUMN {col_name} {col_type}"
                try:
                    conn.execute(text(alter_stmt))
                    conn.commit()
                    print(f"  -> Successfully added {col_name}")
                except Exception as e:
                    print(f"  -> Error adding {col_name}: {e}")
            else:
                print(f"Column {col_name} already exists, skipping.")
                
    print("Migration completed successfully.")

if __name__ == "__main__":
    run_migration()
