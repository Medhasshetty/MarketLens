"""
Export a JSON snapshot of the analytics so the frontend can run as a static demo
(for example on Vercel) when the API is offline.

Usage: python pipeline/export_snapshot.py  ->  ../frontend/lib/demo-snapshot.json
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.services import analytics  # noqa: E402

OUT = Path(__file__).resolve().parents[2] / "frontend" / "lib" / "demo-snapshot.json"


def main():
    regions = analytics.regions()
    snap = {"regions": regions, "overview": {}, "cohorts": {}, "factors": analytics.market_factors()}
    for months in (3, 6, 12):
        for region in ["All"] + regions:
            r = None if region == "All" else region
            snap["overview"][f"{months}|{region}"] = analytics.overview(months, r)
    for region in ["All"] + regions:
        snap["cohorts"][region] = analytics.cohorts(None if region == "All" else region)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(snap, separators=(",", ":")))
    print(f"Wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
