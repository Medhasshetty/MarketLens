"""
Load monthly FX rates (units of local currency per 1 USD) from the Frankfurter API,
which publishes European Central Bank reference rates. Free, no key needed.

Usage: python pipeline/ingest_fx.py 2024-10-01 2026-09-30
"""
import sqlite3
import sys
from collections import defaultdict
from pathlib import Path

import requests

DB = Path(__file__).resolve().parent.parent / "data" / "marketlens.db"


def main(start: str, end: str):
    con = sqlite3.connect(DB)
    currencies = sorted({r[0] for r in con.execute("SELECT currency FROM countries") if r[0] != "USD"})
    url = f"https://api.frankfurter.app/{start}..{end}?from=USD&to={','.join(currencies)}"
    rates = requests.get(url, timeout=60).json().get("rates", {})

    monthly = defaultdict(lambda: defaultdict(list))
    for day, values in rates.items():
        for ccy, v in values.items():
            monthly[day[:7]][ccy].append(v)

    con.execute("DELETE FROM fx_rates WHERE month BETWEEN ? AND ?", (start[:7], end[:7]))
    rows = [(ccy, month, round(sum(v) / len(v), 4)) for month, by_ccy in monthly.items() for ccy, v in by_ccy.items()]
    rows += [("USD", month, 1.0) for month in monthly]
    con.executemany("INSERT INTO fx_rates VALUES (?,?,?)", rows)
    con.commit()
    missing = set(currencies) - {r[0] for r in rows}
    print(f"Loaded {len(rows)} monthly rates." + (f" Not covered by ECB: {', '.join(sorted(missing))}" if missing else ""))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "2024-10-01", sys.argv[2] if len(sys.argv) > 2 else "2026-09-30")
