from __future__ import annotations

import os
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import patch

from cms_sections import is_safe_media_url, placement_is_live, section_is_live
from notifications import order_status, welcome
from ratelimit import client_key


class AuditCorrectionsUnitTest(unittest.TestCase):
    def test_section_and_placement_end_at_boundary_are_not_live(self):
        moment = datetime(2026, 1, 1, tzinfo=timezone.utc)
        self.assertFalse(section_is_live({"endsAt": moment.isoformat()}, moment))
        row = SimpleNamespace(active=True, starts_at=None, ends_at=moment)
        self.assertFalse(placement_is_live(row, moment))

    def test_media_urls_allow_local_and_https_only(self):
        self.assertTrue(is_safe_media_url("/uploads/image.jpg"))
        self.assertTrue(is_safe_media_url("https://cdn.example.test/image.jpg"))
        for value in ("http://cdn.example.test/image.jpg", "javascript:alert(1)", "data:image/png;base64,abc", "//evil.example/image.jpg"):
            self.assertFalse(is_safe_media_url(value))

    @patch("notifications.send_email", return_value=True)
    def test_notification_fields_are_html_escaped(self, send):
        welcome(to="shopper@example.test", name='<img src=x onerror="alert(1)">')
        order_status(to="shopper@example.test", name="A & B", number="<order>", status="<paid>")
        welcome_html = send.call_args_list[0].kwargs["html"]
        status_html = send.call_args_list[1].kwargs["html"]
        self.assertNotIn("<img", welcome_html)
        self.assertIn("&lt;img", welcome_html)
        self.assertIn("A &amp; B", status_html)
        self.assertIn("&lt;paid&gt;", status_html)

    def test_forwarded_for_is_ignored_unless_peer_is_trusted(self):
        request = SimpleNamespace(headers={"x-forwarded-for": "198.51.100.10"}, client=SimpleNamespace(host="10.0.0.4"))
        with patch.dict(os.environ, {"FERIXAS_TRUSTED_PROXIES": ""}, clear=False):
            self.assertEqual(client_key(request), "10.0.0.4")
        with patch.dict(os.environ, {"FERIXAS_TRUSTED_PROXIES": "10.0.0.4"}, clear=False):
            self.assertEqual(client_key(request), "198.51.100.10")


if __name__ == "__main__":
    unittest.main()
