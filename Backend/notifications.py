"""Environment-driven email notifications.

Resend is the current provider adapter. The rest of the API only calls these
helpers, so changing provider or domains is an environment/config change.
When RESEND_API_KEY is absent, events are logged and business actions still
succeed in local development.
"""
from __future__ import annotations

import json
import os
import urllib.request


def send_email(*, to: str, subject: str, html: str) -> bool:
    key = os.getenv("RESEND_API_KEY", "").strip()
    sender = os.getenv("RESEND_FROM", "").strip()
    if not key or not sender:
        print(f"[email:disabled] to={to} subject={subject}")
        return False
    payload = json.dumps({"from": sender, "to": [to], "subject": subject, "html": html}).encode()
    request = urllib.request.Request(
        "https://api.resend.com/emails", data=payload,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"}, method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            return 200 <= response.status < 300
    except Exception as exc:
        print(f"[email:error] provider request failed: {exc}")
        return False


def welcome(*, to: str, name: str) -> None:
    app_url = os.getenv("PUBLIC_APP_URL", "").rstrip("/")
    send_email(to=to, subject="Welcome to Ferixas", html=f"<h1>Welcome, {name}</h1><p>Your Ferixas account is ready.</p><p><a href=\"{app_url}\">Start shopping</a></p>")


def order_confirmation(*, to: str, name: str, number: str, total: float) -> None:
    app_url = os.getenv("PUBLIC_APP_URL", "").rstrip("/")
    send_email(to=to, subject=f"Ferixas order {number} confirmed", html=f"<h1>Thanks for your order, {name}</h1><p>Order <strong>{number}</strong> has been received. Total: <strong>${total:.2f}</strong>.</p><p><a href=\"{app_url}/account/orders\">View your orders</a></p>")


def order_status(*, to: str, name: str, number: str, status: str) -> None:
    send_email(to=to, subject=f"Ferixas order {number}: {status}", html=f"<h1>Order update</h1><p>Hi {name}, order <strong>{number}</strong> is now <strong>{status}</strong>.</p>")
