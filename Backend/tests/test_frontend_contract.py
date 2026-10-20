"""Every console call must resolve to a published API route."""
from __future__ import annotations

import re
import unittest
from pathlib import Path

from app import app

ROOT = Path(__file__).resolve().parents[2]
CALL = re.compile(r'call<[^<>]*>\("(?:GET|POST|PATCH|PUT|DELETE)",\s*"([^"`$]+)"')
KNOWN_DRIFT = set()


class FrontendContractTest(unittest.TestCase):
    def test_every_console_call_resolves_to_a_route(self):
        self.maxDiff = None
        routes = set(app.openapi().get("paths", {}))
        problems = []
        for app_name in ("admin", "merchant", "marketplace"):
            source = (ROOT / "WebPhase" / app_name / "lib" / "api.ts").read_text(encoding="utf-8")
            calls = sorted({match.group(1).strip("/") for match in CALL.finditer(source)})
            self.assertGreaterEqual(len(calls), 5, f"{app_name}/lib/api.ts yielded no API calls")
            for call in calls:
                if "/" + call in routes or call in KNOWN_DRIFT:
                    continue
                problems.append(f"{app_name}: /{call}")
        self.assertEqual([], problems,
                         "These console calls have no backend route:\n  " + "\n  ".join(problems))
