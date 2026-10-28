"""
Refresh country indicators from the World Bank API (free, no key needed).
Updates population, GDP per capita and internet use in the countries table.

Usage: python pipeline/ingest_worldbank.py
"""
import sqlite3
import sys
from pathlib import Path

import requests

DB = Path(__file__).resolve().parent.parent / "data" / "marketlens.db"
INDICATORS = {
    "SP.POP.TOTL": ("population_m", 1e-6),       # population -> millions
    "NY.GDP.PCAP.CD": ("gdp_per_capita", 1),     # GDP per capita, current USD
    "IT.NET.USER.ZS": ("internet_pct", 1),       # internet users, % of population
}


def latest_value(code: str, indicator: str):
    url = f"https://api.worldbank.org/v2/country/{code}/indicator/{indicator}?format=json&mrnev=1"
    data = requests.get(url, timeout=30).json()
    if len(data) < 2 or not data[1]:
        return None
    return data[1][0]["value"]


def main():
    con = sqlite3.connect(DB)
    codes = [r[0] for r in con.execute("SELECT code FROM countries")]
    for code in codes:
        for indicator, (column, scale) in INDICATORS.items():
            try:
                value = latest_value(code, indicator)
            except requests.RequestException as exc:
                print(f"  {code} {indicator}: request failed ({exc})", file=sys.stderr)
                continue
            if value is not None:
                con.execute(f"UPDATE countries SET {column} = ? WHERE code = ?", (round(value * scale, 2), code))
        print(f"Updated {code}")
    con.commit()
    con.close()


if __name__ == "__main__":
    main()
