import os
import re
import sqlite3
from pathlib import Path

DB_PATH = Path(os.getenv("MARKETLENS_DB", Path(__file__).resolve().parent.parent / "data" / "marketlens.db"))

FORBIDDEN = re.compile(
    r"\b(insert|update|delete|drop|alter|create|replace|attach|detach|pragma|vacuum|reindex|trigger)\b",
    re.IGNORECASE,
)


def connect() -> sqlite3.Connection:
    if not DB_PATH.exists():
        raise RuntimeError(f"Database not found at {DB_PATH}. Run: python pipeline/seed_demo.py")
    con = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True, check_same_thread=False)
    con.row_factory = sqlite3.Row
    return con


def query(sql: str, params: tuple | dict = ()) -> list[dict]:
    con = connect()
    try:
        return [dict(r) for r in con.execute(sql, params).fetchall()]
    finally:
        con.close()


def safe_select(sql: str, max_rows: int = 200) -> list[dict]:
    """Run an AI-written query with guardrails: one read-only SELECT/WITH, capped rows."""
    cleaned = sql.strip().rstrip(";").strip()
    if ";" in cleaned:
        raise ValueError("Only one SQL statement is allowed.")
    if not re.match(r"^(select|with)\b", cleaned, re.IGNORECASE):
        raise ValueError("Only SELECT queries are allowed.")
    if FORBIDDEN.search(cleaned):
        raise ValueError("The query contains a write or admin keyword, which is not allowed.")
    con = connect()
    try:
        con.execute("PRAGMA query_only = ON")
        rows = con.execute(cleaned).fetchmany(max_rows)
        return [dict(r) for r in rows]
    finally:
        con.close()


SCHEMA_DOC = """
Tables (SQLite). Money is in USD unless the column says local. Months are 'YYYY-MM' text.

countries(code TEXT PK, name, region, currency, population_m REAL, gdp_per_capita REAL,
          internet_pct REAL, search_index REAL 0-100 category search interest,
          launched INTEGER 1 = brand sells there today, lat, lon)
customers(customer_id PK, country_code -> countries.code, channel acquisition channel,
          first_order_month)
orders(order_id PK, customer_id -> customers, country_code, order_date 'YYYY-MM-DD', order_month,
       category one of Skincare/Haircare/Fragrance/Makeup/Wellness, items, revenue_local,
       revenue_usd, is_repeat 1 if the customer had ordered before)
sessions_monthly(country_code, month, sessions, add_to_cart, checkout, purchases)
fx_rates(currency, month, units_per_usd)

Data covers 2024-10 to 2026-09. Regions: Europe, North America, Latin America, Middle East,
Asia Pacific, Africa. Countries with launched = 0 are expansion candidates with no sales yet.
"""
