#!/usr/bin/env python3
"""Measure the live FloatChat API and persist p50/p95 latency results."""

from __future__ import annotations

import argparse
import json
import os
import statistics
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ENDPOINTS = (
    ("floats", "/api/floats"),
    ("transect", "/api/transect?floatId=WMO%202902746"),
    ("anomalies", "/api/anomalies"),
)


def percentile(values: list[float], fraction: float) -> float:
    ordered = sorted(values)
    if not ordered:
        return 0.0
    index = min(len(ordered) - 1, max(0, round((len(ordered) - 1) * fraction)))
    return ordered[index]


def request_once(url: str) -> tuple[float, int, int]:
    started = time.perf_counter_ns()
    try:
        request = Request(url, headers={"Accept": "application/json"})
        with urlopen(request, timeout=10) as response:
            body = response.read()
            status = response.status
    except (HTTPError, URLError) as error:
        elapsed = (time.perf_counter_ns() - started) / 1_000_000
        status = getattr(error, "code", 0)
        return elapsed, status, 0
    elapsed = (time.perf_counter_ns() - started) / 1_000_000
    return elapsed, status, len(body)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--runs", type=int, default=60)
    parser.add_argument("--base-url", default=os.getenv("FLOATCHAT_BENCHMARK_BASE_URL", "http://127.0.0.1:8080"))
    parser.add_argument(
        "--output",
        default="artifacts/floatchat/public/benchmark-results.json",
    )
    args = parser.parse_args()

    if args.runs < len(ENDPOINTS):
        raise SystemExit(f"--runs must be at least {len(ENDPOINTS)}")

    samples: dict[str, list[float]] = {name: [] for name, _ in ENDPOINTS}
    statuses: dict[str, list[int]] = {name: [] for name, _ in ENDPOINTS}
    sizes: dict[str, list[int]] = {name: [] for name, _ in ENDPOINTS}

    for index in range(args.runs):
        name, path = ENDPOINTS[index % len(ENDPOINTS)]
        elapsed, status, size = request_once(f"{args.base_url.rstrip('/')}{path}")
        samples[name].append(elapsed)
        statuses[name].append(status)
        sizes[name].append(size)

    all_latencies = [latency for endpoint in samples.values() for latency in endpoint]
    result = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "baseUrl": args.base_url,
        "runs": args.runs,
        "successfulRequests": sum(status == 200 for status_list in statuses.values() for status in status_list),
        "aggregate": {
            "p50Ms": round(percentile(all_latencies, 0.50), 3),
            "p95Ms": round(percentile(all_latencies, 0.95), 3),
            "meanMs": round(statistics.mean(all_latencies), 3),
            "minMs": round(min(all_latencies), 3),
            "maxMs": round(max(all_latencies), 3),
        },
        "endpoints": {
            name: {
                "path": path,
                "runs": len(samples[name]),
                "p50Ms": round(percentile(samples[name], 0.50), 3),
                "p95Ms": round(percentile(samples[name], 0.95), 3),
                "meanMs": round(statistics.mean(samples[name]), 3),
                "statusCodes": sorted(set(statuses[name])),
                "averageBytes": round(statistics.mean(sizes[name])),
            }
            for name, path in ENDPOINTS
        },
    }

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")

    print(f"FloatChat API benchmark: {args.runs} requests")
    print(f"aggregate p50={result['aggregate']['p50Ms']}ms p95={result['aggregate']['p95Ms']}ms")
    for name, details in result["endpoints"].items():
        print(f"{name:9} p50={details['p50Ms']}ms p95={details['p95Ms']}ms status={details['statusCodes']}")
    print(f"saved {output}")


if __name__ == "__main__":
    main()