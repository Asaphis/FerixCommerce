"""Check candidate section palettes: contract acceptance plus WCAG contrast.

Run from Backend so the real validator is used:
    .venv/bin/python ../tools/check_section_palettes.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "Backend"))

from cms_sections import is_safe_css_color  # noqa: E402


def stops(value: str) -> list[str]:
    """The colours a background actually paints, for contrast checking."""
    raw = value.strip()
    if not raw.lower().startswith(("linear-gradient", "radial-gradient", "conic-gradient")):
        return [raw]
    body = raw[raw.index("(") + 1: raw.rindex(")")]
    found: list[str] = []
    depth = 0
    token = ""
    for char in body:
        if char == "(":
            depth += 1
        elif char == ")":
            depth -= 1
        if char == "," and depth == 0:
            found.append(token.strip())
            token = ""
            continue
        token += char
    found.append(token.strip())
    colors = []
    for part in found:
        piece = part.split(" ")[0].strip()
        if piece.startswith("#") or piece.lower().startswith(("rgb", "hsl")):
            colors.append(piece)
    return colors or [raw]


def rgb(color: str) -> tuple[int, int, int]:
    text = color.strip().lower()
    if text.startswith("#"):
        digits = text[1:]
        if len(digits) == 3:
            digits = "".join(c * 2 for c in digits)
        return tuple(int(digits[i:i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]
    if text.startswith("rgb"):
        parts = text[text.index("(") + 1: text.rindex(")")].split(",")
        return tuple(int(float(p.strip())) for p in parts[:3])  # type: ignore[return-value]
    if text.startswith("hsl"):
        import colorsys
        parts = [p.strip() for p in text[text.index("(") + 1: text.rindex(")")].split(",")]
        hue = float(parts[0].replace("deg", "")) / 360
        sat = float(parts[1].rstrip("%")) / 100
        light = float(parts[2].rstrip("%")) / 100
        r, g, b = colorsys.hls_to_rgb(hue, light, sat)
        return (round(r * 255), round(g * 255), round(b * 255))
    named = {"white": (255, 255, 255), "black": (0, 0, 0), "transparent": (255, 255, 255)}
    return named.get(text, (255, 255, 255))


def luminance(color: str) -> float:
    def channel(value: int) -> float:
        c = value / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = rgb(color)
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)


def contrast(foreground: str, background: str) -> float:
    a, b = luminance(foreground), luminance(background)
    high, low = max(a, b), min(a, b)
    return round((high + 0.05) / (low + 0.05), 2)


def worst(foreground: str, background: str) -> float:
    """The lowest contrast across a gradient's stops — what a reader actually meets."""
    return min(contrast(foreground, stop) for stop in stops(background))


PALETTES: list[dict] = [
    {
        "name": "Ember Midnight",
        "background": "linear-gradient(135deg, #0B1F30 0%, #102D43 50%, #6E2A18 100%)",
        "accent": "#F05A28",
        "text": "#FFFFFF",
        "timerBackground": "linear-gradient(180deg, #FFB38A 0%, #FF8D59 100%)",
        "timerText": "#3A1405",
        "badge": "#F05A28",
    },
    {
        "name": "Deep Void",
        "background": "linear-gradient(160deg, #071824 0%, #102D43 60%, #17405F 100%)",
        "accent": "#F05A28",
        "text": "#FFFFFF",
        "timerBackground": "#FFFFFF",
        "timerText": "#102D43",
        "badge": "#3479A8",
    },
    {
        "name": "Ember Glow",
        "background": "radial-gradient(circle at 75% 0%, #A8330F 0%, #6E2A18 45%, #102D43 100%)",
        "accent": "#FFB38A",
        "text": "#FFFFFF",
        "timerBackground": "#102D43",
        "timerText": "#FFB38A",
        "badge": "#FFB38A",
    },
    {
        "name": "Pine Signal",
        "background": "linear-gradient(140deg, #06231D 0%, #0F3A31 55%, #16856F 100%)",
        "accent": "#5FD3B8",
        "text": "#FFFFFF",
        "timerBackground": "#FFFFFF",
        "timerText": "#0F3A31",
        "badge": "#16856F",
    },
    {
        "name": "Azure Trust",
        "background": "linear-gradient(145deg, #0B2233 0%, #1B4A6B 55%, #3479A8 100%)",
        "accent": "#8FC7E8",
        "text": "#FFFFFF",
        "timerBackground": "linear-gradient(180deg, #FFFFFF 0%, #E7F1F8 100%)",
        "timerText": "#0B2233",
        "badge": "#3479A8",
    },
    {
        "name": "Ember Cream (light)",
        "background": "linear-gradient(135deg, #FFFFFF 0%, #FFF3EF 55%, #FFE0D2 100%)",
        "accent": "#C2410C",
        "text": "#12263A",
        "timerBackground": "linear-gradient(180deg, #C2410C 0%, #9A3412 100%)",
        "timerText": "#FFFFFF",
        "badge": "#C2410C",
    },
    {
        "name": "Bone Cool (light)",
        "background": "linear-gradient(135deg, #F3F6FA 0%, #E7EEF6 60%, #D9E6F2 100%)",
        "accent": "#1E5B84",
        "text": "#12263A",
        "timerBackground": "#12263A",
        "timerText": "#FFFFFF",
        "badge": "#1E5B84",
    },
    {
        "name": "Bone Sand (light)",
        "background": "linear-gradient(135deg, #FFFDF7 0%, #FBF1DC 60%, #F3E2BE 100%)",
        "accent": "#8A5A0B",
        "text": "#2B1D06",
        "timerBackground": "#2B1D06",
        "timerText": "#F7E7C4",
        "badge": "#8A5A0B",
    },
    {
        "name": "Plum Night",
        "background": "conic-gradient(from 210deg at 30% 20%, #102D43 0%, #3A1F45 55%, #6E2A18 100%)",
        "accent": "#E9A0C8",
        "text": "#FFFFFF",
        "timerBackground": "#FFFFFF",
        "timerText": "#3A1F45",
        "badge": "#B3528F",
    },
]

SUPPORTING: list[dict] = [
    {
        "name": "Message strip - delivery",
        "background": "#102D43",
        "accent": "#FFB38A",
        "text": "#FFFFFF",
    },
    {
        "name": "Message strip - offer",
        "background": "linear-gradient(90deg, #9A3412 0%, #C2410C 100%)",
        "accent": "#FFF3EF",
        "text": "#FFFFFF",
    },
    {
        "name": "Message strip - quiet notice",
        "background": "#F3F6FA",
        "accent": "#1E5B84",
        "text": "#12263A",
    },
    {
        "name": "Footer - dark",
        "background": "linear-gradient(180deg, #102D43 0%, #0B1F30 100%)",
        "accent": "#FFB38A",
        "text": "#FFFFFF",
    },
    {
        "name": "Footer - light",
        "background": "#F3F6FA",
        "accent": "#C2410C",
        "text": "#12263A",
    },
]

failures = 0
for palette in SUPPORTING:
    print(f"\n=== {palette['name']} ===")
    for key in ("background", "accent", "text"):
        value = palette[key]
        gradient = value.lower().startswith(("linear", "radial", "conic"))
        ok = is_safe_css_color(value, allow_gradient=gradient)
        if not ok:
            failures += 1
        print(f"  [{'OK ' if ok else 'REJECTED'}] {key:<12} {value}")
    text_bg = worst(palette["text"], palette["background"])
    accent_bg = worst(palette["accent"], palette["background"])
    print(f"  text vs background  : {text_bg}  {'pass AA' if text_bg >= 4.5 else 'FAIL'}")
    print(f"  accent vs background: {accent_bg}  {'pass' if accent_bg >= 3 else 'FAIL'}")
    if text_bg < 4.5 or accent_bg < 3:
        failures += 1

for palette in PALETTES:
    print(f"\n=== {palette['name']} ===")
    for key in ("background", "accent", "text", "timerBackground", "timerText", "badge"):
        value = palette[key]
        gradient = value.lower().startswith(("linear", "radial", "conic"))
        ok = is_safe_css_color(value, allow_gradient=gradient)
        flag = "OK " if ok else "REJECTED"
        if not ok:
            failures += 1
        print(f"  [{flag}] {key:<16} {value}")
    text_bg = worst(palette["text"], palette["background"])
    timer = worst(palette["timerText"], palette["timerBackground"])
    # The storefront picks the readable ink for a badge, so judge the best of the two.
    badge = max(contrast("#FFFFFF", palette["badge"]), contrast("#12263A", palette["badge"]))
    print(f"  text vs background : {text_bg}  {'pass AA' if text_bg >= 4.5 else 'FAIL'}")
    print(f"  timer text vs timer: {timer}  {'pass AA' if timer >= 4.5 else 'FAIL'}")
    print(f"  white vs badge     : {badge}  {'pass AA' if badge >= 4.5 else 'check'}")
    if text_bg < 4.5 or timer < 4.5:
        failures += 1

print(f"\n{'ALL PALETTES PASS' if failures == 0 else str(failures) + ' ISSUES'}")
