#!/usr/bin/env python3
"""Turn benchmark JSON into a compact annotated SVG architecture diagram."""

from __future__ import annotations

import argparse
import html
import json
from pathlib import Path


def esc(value: object) -> str:
    return html.escape(str(value))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="artifacts/floatchat/public/benchmark-results.json")
    parser.add_argument("--output", default="artifacts/floatchat/public/architecture-latency.svg")
    args = parser.parse_args()

    source = Path(args.input)
    data = json.loads(source.read_text(encoding="utf-8"))
    aggregate = data["aggregate"]
    endpoints = data["endpoints"]
    cards = [
        ("CLIENT", "FloatChat / R3F + Recharts", "#70e7d9"),
        ("API", "Express /api", "#8ce9ff"),
        ("DATA", "ARGO observation payloads", "#b7a7ff"),
    ]
    card_x = [56, 304, 552]
    card_svg = []
    for (label, detail, color), x in zip(cards, card_x):
        card_svg.append(
            f'<rect x="{x}" y="104" width="188" height="98" rx="2" fill="#08232b" stroke="{color}" stroke-opacity=".55"/>'
            f'<text x="{x + 18}" y="134" fill="{color}" font-family="monospace" font-size="11" letter-spacing="2">{label}</text>'
            f'<text x="{x + 18}" y="162" fill="#cfece7" font-family="Arial" font-size="13">{esc(detail)}</text>'
        )
    arrows = "".join(
        f'<path d="M{card_x[index] + 188} 153 H{card_x[index + 1] - 14}" stroke="#70e7d9" stroke-opacity=".55" stroke-dasharray="3 7" fill="none"/><path d="M{card_x[index + 1] - 14} 153 l-8 -5 v10 z" fill="#70e7d9"/>'
        for index in range(len(card_x) - 1)
    )
    endpoint_rows = []
    for index, (name, details) in enumerate(endpoints.items()):
        y = 282 + index * 39
        endpoint_rows.append(
            f'<text x="56" y="{y}" fill="#9fc6bf" font-family="monospace" font-size="11">{esc(name.upper())}</text>'
            f'<text x="212" y="{y}" fill="#70e7d9" font-family="monospace" font-size="11">p50 {esc(details["p50Ms"])}ms</text>'
            f'<text x="390" y="{y}" fill="#f5a074" font-family="monospace" font-size="11">p95 {esc(details["p95Ms"])}ms</text>'
            f'<text x="570" y="{y}" fill="#62858a" font-family="monospace" font-size="10">{esc(details["runs"])} samples / HTTP {esc(details["statusCodes"])}</text>'
        )
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="820" height="470" viewBox="0 0 820 470">
<rect width="820" height="470" fill="#020d13"/>
<text x="56" y="48" fill="#e3f7f1" font-family="Arial" font-size="25" font-weight="600">FloatChat request architecture</text>
<text x="56" y="73" fill="#6f9799" font-family="monospace" font-size="10" letter-spacing="1.5">LIVE BENCHMARK / {esc(data["generatedAt"])} / {esc(data["runs"])} REQUESTS</text>
{"".join(card_svg)}
{arrows}
<line x1="56" y1="242" x2="764" y2="242" stroke="#70e7d9" stroke-opacity=".18"/>
<text x="56" y="266" fill="#58777e" font-family="monospace" font-size="10" letter-spacing="1.5">ENDPOINT LATENCY</text>
{"".join(endpoint_rows)}
<rect x="56" y="399" width="708" height="42" fill="#08232b" stroke="#70e7d9" stroke-opacity=".2"/>
<text x="74" y="425" fill="#70e7d9" font-family="monospace" font-size="12">AGGREGATE  p50 {esc(aggregate["p50Ms"])}ms  /  p95 {esc(aggregate["p95Ms"])}ms  /  {esc(data["successfulRequests"])} successful</text>
</svg>
"""
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(svg, encoding="utf-8")
    print(f"saved {output}")


if __name__ == "__main__":
    main()