"""Local runtime shim for the Ferixas mock backend.

`ferix_backend_mock.py` is written for the hosted Codewords runtime, where
`codewords_client` provides structured logging, a Redis handle and a service
runner. This module supplies the same three names backed by an in-process
store, so the exact same backend file can be run on a laptop for frontend
development and verification without Redis or an API key.

Nothing in the backend file is modified: put this directory first on
PYTHONPATH and `python3 ferix_backend_mock.py` just works.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any, Dict, Optional, Set

import uvicorn

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")


class _Logger:
    """Standard logging, but tolerates the runtime's `logger.info(msg, key=val)` style."""

    def __init__(self, name: str = "ferix") -> None:
        self._log = logging.getLogger(name)

    @staticmethod
    def _render(message: str, extra: Dict[str, Any]) -> str:
        if not extra:
            return message
        return message + " " + " ".join(f"{k}={v}" for k, v in extra.items())

    def info(self, message: str, **extra: Any) -> None:
        self._log.info(self._render(message, extra))

    def warning(self, message: str, **extra: Any) -> None:
        self._log.warning(self._render(message, extra))

    def error(self, message: str, **extra: Any) -> None:
        self._log.error(self._render(message, extra))

    def debug(self, message: str, **extra: Any) -> None:
        self._log.debug(self._render(message, extra))


logger = _Logger()


class _Store:
    """The handful of Redis commands the backend actually uses."""

    def __init__(self) -> None:
        self._values: Dict[str, str] = {}
        self._sets: Dict[str, Set[str]] = {}
        self._expiry: Dict[str, float] = {}

    def _expired(self, key: str) -> bool:
        deadline = self._expiry.get(key)
        if deadline is not None and deadline < time.time():
            self._values.pop(key, None)
            self._sets.pop(key, None)
            self._expiry.pop(key, None)
            return True
        return False

    async def get(self, key: str) -> Optional[str]:
        return None if self._expired(key) else self._values.get(key)

    async def set(self, key: str, value: str) -> bool:
        self._values[key] = value
        return True

    async def setex(self, key: str, ttl: int, value: str) -> bool:
        self._values[key] = value
        self._expiry[key] = time.time() + float(ttl)
        return True

    async def sadd(self, key: str, *values: str) -> int:
        bucket = self._sets.setdefault(key, set())
        before = len(bucket)
        bucket.update(str(v) for v in values)
        return len(bucket) - before

    async def smembers(self, key: str) -> Set[str]:
        return set(self._sets.get(key, set()))

    async def incr(self, key: str, amount: int = 1) -> int:
        current = int(self._values.get(key, "0")) + amount
        self._values[key] = str(current)
        return current

    async def delete(self, *keys: str) -> int:
        removed = 0
        for key in keys:
            for bucket in (self._values, self._sets, self._expiry):
                if key in bucket:
                    bucket.pop(key, None)
                    removed += 1
        return removed

    async def keys(self, pattern: str = "*") -> list[str]:
        return [k for k in self._values if not self._expired(k)]

    async def flushall(self) -> bool:
        self._values.clear()
        self._sets.clear()
        self._expiry.clear()
        return True


_STORE = _Store()
_NAMESPACE = os.environ.get("CODEWORDS_NAMESPACE", "ferix")


class _RedisContext:
    async def __aenter__(self) -> tuple[_Store, str]:
        return _STORE, _NAMESPACE

    async def __aexit__(self, *exc: Any) -> bool:
        return False


def redis_client() -> _RedisContext:
    return _RedisContext()


def run_service(app: Any) -> None:
    """Serve the app. The hosted runtime does this; locally it is uvicorn."""
    port = int(os.environ.get("PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")
