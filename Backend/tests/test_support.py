"""Shared safeguards for backend tests that need an empty database per case."""
from __future__ import annotations

import os
from pathlib import Path


def reset_test_database() -> None:
    """Drop test tables only when the app is using its disposable SQLite fixture."""
    from core import Base, engine

    database = str(engine.url.database or "")
    if (
        os.getenv("FERIXAS_ENV") != "test"
        or engine.dialect.name != "sqlite"
        or not database
        or not Path(database).name.startswith("ferixas-")
    ):
        raise RuntimeError("Refusing to reset a database outside the disposable Ferixas SQLite test fixture")
    Base.metadata.drop_all(engine)
