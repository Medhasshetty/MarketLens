"""
Generate a realistic synthetic dataset so MarketLens runs out of the box.

Replace with real data later using:
  - pipeline/ingest_online_retail.py  (UCI Online Retail II transactions)
  - pipeline/ingest_worldbank.py      (GDP, internet use, population)
  - pipeline/ingest_fx.py             (monthly FX rates)

Usage:  python pipeline/seed_demo.py
Output: data/marketlens.db (SQLite)
"""
import sqlite3
from datetime import date
from pathlib import Path

import numpy as np

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "marketlens.db"
rng = np.random.default_rng(42)

# code, name, region, currency, population (m), GDP per capita (USD), internet %, search index,
# base monthly customers (0 = not yet launched), growth trend, lat, lon
COUNTRIES = [
    ("GB", "United Kingdom", "Europe", "GBP", 68.3, 48900, 97, 78, 900, 0.004, 54.0, -2.0),
    ("DE", "Germany", "Europe", "EUR", 84.5, 52700, 93, 74, 620, 0.010, 51.2, 10.4),
    ("FR", "France", "Europe", "EUR", 68.2, 44400, 92, 70, 520, 0.006, 46.2, 2.2),
    ("NL", "Netherlands", "Europe", "EUR", 17.9, 62500, 97, 66, 260, 0.012, 52.1, 5.3),
    ("ES", "Spain", "Europe", "EUR", 48.6, 33500, 95, 63, 300, 0.015, 40.4, -3.7),
    ("IT", "Italy", "Europe", "EUR", 58.9, 38400, 87, 61, 280, -0.004, 41.9, 12.6),
    ("SE", "Sweden", "Europe", "SEK", 10.6, 55500, 96, 58, 140, 0.003, 60.1, 18.6),
    ("PL", "Poland", "Europe", "PLN", 36.7, 22100, 87, 64, 160, 0.024, 51.9, 19.1),
    ("US", "United States", "North America", "USD", 335.0, 81700, 92, 85, 820, 0.014, 39.8, -98.6),
    ("CA", "Canada", "North America", "CAD", 40.1, 53400, 94, 69, 230, 0.009, 56.1, -106.3),
    ("MX", "Mexico", "Latin America", "MXN", 129.0, 13800, 78, 72, 0, 0.0, 23.6, -102.5),
    ("BR", "Brazil", "Latin America", "BRL", 216.0, 10300, 84, 76, 190, 0.020, -14.2, -51.9),
    ("AE", "United Arab Emirates", "Middle East", "AED", 9.5, 52900, 100, 71, 180, 0.026, 23.4, 53.8),
    ("SA", "Saudi Arabia", "Middle East", "SAR", 36.9, 32600, 99, 75, 0, 0.0, 23.9, 45.1),
    ("IN", "India", "Asia Pacific", "INR", 1438.0, 2500, 52, 88, 420, 0.030, 20.6, 78.9),
    ("SG", "Singapore", "Asia Pacific", "SGD", 5.9, 84700, 96, 62, 150, 0.011, 1.35, 103.8),
    ("JP", "Japan", "Asia Pacific", "JPY", 124.5, 33800, 87, 60, 240, -0.006, 36.2, 138.3),
    ("AU", "Australia", "Asia Pacific", "AUD", 26.6, 64700, 96, 67, 310, 0.008, -25.3, 133.8),
    ("KR", "South Korea", "Asia Pacific", "KRW", 51.7, 33100, 97, 65, 120, 0.013, 35.9, 127.8),
    ("ID", "Indonesia", "Asia Pacific", "IDR", 277.5, 4900, 69, 80, 0, 0.0, -0.8, 113.9),
    ("VN", "Vietnam", "Asia Pacific", "VND", 100.3, 4300, 79, 77, 0, 0.0, 14.1, 108.3),
    ("ZA", "South Africa", "Africa", "ZAR", 60.4, 6200, 75, 59, 90, 0.007, -30.6, 22.9),
    ("NG", "Nigeria", "Africa", "NGN", 223.8, 1600, 55, 68, 0, 0.0, 9.1, 8.7),
]

FX_TO_USD = {  # local units per 1 USD (approximate, demo only)
    "GBP": 0.79, "EUR": 0.92, "SEK": 10.6, "PLN": 3.98, "USD": 1.0, "CAD": 1.36, "MXN": 17.9,
    "BRL": 5.4, "AED": 3.67, "SAR": 3.75, "INR": 83.5, "SGD": 1.35, "JPY": 151.0, "AUD": 1.52,
    "KRW": 1360.0, "IDR": 15800.0, "VND": 25000.0, "ZAR": 18.6, "NGN": 1500.0,
}

CATEGORIES = [("Skincare", 0.34, 42), ("Haircare", 0.22, 31), ("Fragrance", 0.16, 68),
              ("Makeup", 0.18, 36), ("Wellness", 0.10, 29)]
CHANNELS = [("Organic search", 0.30), ("Paid social", 0.26), ("Paid search", 0.18),
            ("Email", 0.10), ("Marketplaces", 0.10), ("Referral", 0.06)]

START = date(2024, 10, 1)
N_MONTHS = 24  # Oct 2024 - Sep 2026


def month_start(i: int) -> date:
    y = START.year + (START.month - 1 + i) // 12
    m = (START.month - 1 + i) % 12 + 1
    return date(y, m, 1)


def main():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if DB_PATH.exists():
        DB_PATH.unlink()
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.executescript(
        """
        CREATE TABLE countries (
            code TEXT PRIMARY KEY, name TEXT, region TEXT, currency TEXT,
            population_m REAL, gdp_per_capita REAL, internet_pct REAL, search_index REAL,
            launched INTEGER, lat REAL, lon REAL);
        CREATE TABLE customers (
            customer_id INTEGER PRIMARY KEY, country_code TEXT, channel TEXT, first_order_month TEXT);
        CREATE TABLE orders (
            order_id INTEGER PRIMARY KEY, customer_id INTEGER, country_code TEXT, order_date TEXT,
            order_month TEXT, category TEXT, items INTEGER, revenue_local REAL, revenue_usd REAL,
            is_repeat INTEGER);
        CREATE TABLE sessions_monthly (
            country_code TEXT, month TEXT, sessions INTEGER, add_to_cart INTEGER,
            checkout INTEGER, purchases INTEGER);
        CREATE TABLE fx_rates (currency TEXT, month TEXT, units_per_usd REAL);
        """
    )

    for c in COUNTRIES:
        code, name, region, cur_code, pop, gdp, net, search, base, _, lat, lon = c
        cur.execute("INSERT INTO countries VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                    (code, name, region, cur_code, pop, gdp, net, search, int(base > 0), lat, lon))

    for ccy, rate in FX_TO_USD.items():
        for i in range(N_MONTHS):
            drift = 1 + rng.normal(0, 0.012) + (0.002 * i if ccy in ("NGN", "BRL") else 0)
            cur.execute("INSERT INTO fx_rates VALUES (?,?,?)",
                        (ccy, month_start(i).strftime("%Y-%m"), round(rate * drift, 4)))

    cust_id, order_id = 0, 0
    cat_names = [c[0] for c in CATEGORIES]
    cat_p = np.array([c[1] for c in CATEGORIES])
    cat_price = {c[0]: c[2] for c in CATEGORIES}
    ch_names = [c[0] for c in CHANNELS]
    ch_p = np.array([c[1] for c in CHANNELS])
    orders_rows, cust_rows, sess_rows = [], [], []

    for c in COUNTRIES:
        code, _, region, ccy, _, gdp, net, _, base, trend, _, _ = c
        if base == 0:
            continue
        wealth = min(1.5, max(0.55, gdp / 50000))
        loyalty = {"Europe": 0.30, "North America": 0.27, "Asia Pacific": 0.25,
                   "Middle East": 0.29, "Latin America": 0.21, "Africa": 0.18}[region]
        if code == "IT":
            loyalty -= 0.05
        if code == "AE":
            loyalty += 0.04
        active: list[tuple[int, int]] = []  # (customer_id, joined_month)

        for m in range(N_MONTHS):
            season = 1 + 0.22 * np.cos((month_start(m).month - 12) / 12 * 2 * np.pi)
            new_n = int(base * (1 + trend) ** m * season * rng.uniform(0.9, 1.1) / 4)
            month_label = month_start(m).strftime("%Y-%m")
            for _ in range(new_n):
                cust_id += 1
                cust_rows.append((cust_id, code, str(rng.choice(ch_names, p=ch_p)), month_label))
                active.append((cust_id, m))
            month_orders = 0
            for cid, joined in active:
                age = m - joined
                if age == 0:
                    p = 1.0
                else:
                    p = loyalty * (0.82 ** (age - 1)) * 0.9
                if rng.random() > p:
                    continue
                order_id += 1
                month_orders += 1
                cat = str(rng.choice(cat_names, p=cat_p))
                items = int(rng.integers(1, 4))
                usd = round(cat_price[cat] * items * wealth * rng.uniform(0.75, 1.3), 2)
                day = int(rng.integers(1, 28))
                d = month_start(m).replace(day=day)
                orders_rows.append((order_id, cid, code, d.isoformat(), month_label, cat, items,
                                    round(usd * FX_TO_USD[ccy], 2), usd, int(age > 0)))
            conv = {"Europe": 0.026, "North America": 0.029, "Asia Pacific": 0.021,
                    "Middle East": 0.031, "Latin America": 0.016, "Africa": 0.013}[region]
            if code == "BR":
                conv *= 0.8
            conv *= rng.uniform(0.92, 1.08)
            sessions = int(month_orders / conv)
            atc = int(sessions * rng.uniform(0.085, 0.11))
            chk = int(atc * rng.uniform(0.42, 0.55) * (0.8 if code in ("BR", "IN") else 1))
            sess_rows.append((code, month_label, sessions, atc, max(chk, month_orders), month_orders))

    cur.executemany("INSERT INTO customers VALUES (?,?,?,?)", cust_rows)
    cur.executemany("INSERT INTO orders VALUES (?,?,?,?,?,?,?,?,?,?)", orders_rows)
    cur.executemany("INSERT INTO sessions_monthly VALUES (?,?,?,?,?,?)", sess_rows)
    cur.executescript(
        """
        CREATE INDEX idx_orders_month ON orders(order_month);
        CREATE INDEX idx_orders_country ON orders(country_code);
        CREATE INDEX idx_orders_customer ON orders(customer_id);
        """
    )
    con.commit()
    con.close()
    print(f"Created {DB_PATH} with {len(cust_rows):,} customers and {len(orders_rows):,} orders")


if __name__ == "__main__":
    main()
