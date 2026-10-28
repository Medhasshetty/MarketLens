"""
Load the UCI Online Retail II dataset (real transactions from a UK retailer with
customers in ~40 countries) into the MarketLens schema.

1. Download online_retail_II.xlsx from https://archive.ics.uci.edu/dataset/502/online+retail+ii
2. Put it in backend/data/
3. Run: python pipeline/ingest_online_retail.py

The dataset has no web sessions or acquisition channels, so those tables keep their demo
values. Prices are in GBP and are converted to USD with the fx_rates table.
"""
import sqlite3
from pathlib import Path

import pandas as pd

DATA = Path(__file__).resolve().parent.parent / "data"
DB = DATA / "marketlens.db"

COUNTRY_CODES = {
    "United Kingdom": "GB", "Germany": "DE", "France": "FR", "Netherlands": "NL", "Spain": "ES",
    "Italy": "IT", "Sweden": "SE", "Poland": "PL", "USA": "US", "Canada": "CA", "Brazil": "BR",
    "United Arab Emirates": "AE", "Singapore": "SG", "Japan": "JP", "Australia": "AU",
    "Korea": "KR", "RSA": "ZA", "Saudi Arabia": "SA", "Nigeria": "NG",
}


def main():
    frames = pd.read_excel(DATA / "online_retail_II.xlsx", sheet_name=None)
    df = pd.concat(frames.values(), ignore_index=True)
    df = df.dropna(subset=["Customer ID"])
    df = df[(df["Quantity"] > 0) & (df["Price"] > 0) & ~df["Invoice"].astype(str).str.startswith("C")]
    df["country_code"] = df["Country"].map(COUNTRY_CODES)
    df = df.dropna(subset=["country_code"])
    df["line_gbp"] = df["Quantity"] * df["Price"]
    df["order_date"] = pd.to_datetime(df["InvoiceDate"]).dt.date.astype(str)
    df["order_month"] = df["order_date"].str[:7]

    orders = (df.groupby(["Invoice", "Customer ID", "country_code", "order_date", "order_month"])
                .agg(items=("Quantity", "sum"), revenue_local=("line_gbp", "sum")).reset_index())

    con = sqlite3.connect(DB)
    fx = pd.read_sql("SELECT month, units_per_usd FROM fx_rates WHERE currency = 'GBP'", con)
    orders = orders.merge(fx, left_on="order_month", right_on="month", how="left")
    orders["units_per_usd"] = orders["units_per_usd"].fillna(0.79)
    orders["revenue_usd"] = (orders["revenue_local"] / orders["units_per_usd"]).round(2)
    orders = orders.sort_values("order_date")
    orders["is_repeat"] = orders.duplicated("Customer ID").astype(int)
    orders["category"] = "General merchandise"

    customers = (orders.groupby("Customer ID")
                       .agg(country_code=("country_code", "first"), first_order_month=("order_month", "min"))
                       .reset_index())
    customers["channel"] = "Unknown"

    con.execute("DELETE FROM orders")
    con.execute("DELETE FROM customers")
    con.execute("UPDATE countries SET launched = 0")
    customers.rename(columns={"Customer ID": "customer_id"})[
        ["customer_id", "country_code", "channel", "first_order_month"]].to_sql("customers", con, if_exists="append", index=False)
    out = orders.rename(columns={"Customer ID": "customer_id"})
    out["order_id"] = range(1, len(out) + 1)
    out[["order_id", "customer_id", "country_code", "order_date", "order_month", "category", "items",
         "revenue_local", "revenue_usd", "is_repeat"]].to_sql("orders", con, if_exists="append", index=False)
    con.execute("UPDATE countries SET launched = 1 WHERE code IN (SELECT DISTINCT country_code FROM orders)")
    con.commit()
    con.close()
    print(f"Loaded {len(out):,} orders from {len(customers):,} customers")


if __name__ == "__main__":
    main()
