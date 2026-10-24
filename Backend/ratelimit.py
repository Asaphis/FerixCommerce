"""A small in-process limiter for the handful of routes worth abusing.

Deliberately dependency-free: a login form, a cart and an upload endpoint do not
justify Redis on day one. Counters are per process - correct for brute-force
protection on one instance, and a known limitation the moment you run several.
`FERIXAS_RATE_LIMIT=off` disables it; tests are always exempt.
"""
from __future__ import annotations

import os
import threading
import time

BUCKETS = {"auth": (12, 60), "cart": (120, 60), "upload": (30, 60)}

_ENABLED = os.getenv("FERIXAS_RATE_LIMIT", "on").strip().lower() not in {"off", "0", "false", "no"}
_STATE = {}
_LOCK = threading.Lock()
_MAX_KEYS = 20000


def disabled() -> bool:
    if not _ENABLED:
        return True
    return os.getenv("FERIXAS_ENV", "").strip().lower() == "test"


def bucket_for(method: str, path: str):
    method = (method or "").upper()
    path = path or ""
    if path in {"/auth/login", "/auth/register", "/admin/login",
                "/admin/bootstrap", "/merchant/login"}:
        return "auth"
    if method != "GET" and (path.startswith("/cart") or path.startswith("/checkout")):
        return "cart"
    if method == "POST" and path.rstrip("/").endswith("/media/upload"):
        return "upload"
    return None


def client_key(request) -> str:
    # Forwarded headers are user-controlled unless the immediate peer is a
    # configured trusted proxy. Never let clients spoof a limiter identity.
    trusted = {item.strip() for item in os.getenv("FERIXAS_TRUSTED_PROXIES", "").split(",") if item.strip()}
    client = getattr(request, "client", None)
    peer = str(getattr(client, "host", "") or "unknown")
    if peer in trusted:
        forwarded = (request.headers.get("x-forwarded-for") or "").split(",")[0].strip()
        if forwarded:
            return forwarded
    return peer


def check(bucket: str, identity: str):
    limit, window = BUCKETS.get(bucket, (60, 60))
    key = f"{bucket}:{identity}"
    moment = time.monotonic()
    with _LOCK:
        if len(_STATE) > _MAX_KEYS:
            _STATE.clear()
        hits = [at for at in _STATE.get(key, []) if moment - at < window]
        if len(hits) >= limit:
            return False, max(1, int(window - (moment - hits[0])) + 1), limit
        hits.append(moment)
        _STATE[key] = hits
        return True, 0, limit
