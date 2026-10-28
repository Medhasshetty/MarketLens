"""Analytics layer: every number on the dashboard and in reports comes from here."""
from __future__ import annotations

from ..db import query


def _months() -> list[str]:
    return [r["m"] for r in query("SELECT DISTINCT order_month AS m FROM orders ORDER BY m")]


def _window(months: int) -> tuple[list[str], list[str]]:
    all_m = _months()
    months = max(1, min(months, len(all_m) // 2))
    return all_m[-months:], all_m[-2 * months:-months]


def _region_clause(region: str | None, alias: str = "o") -> tuple[str, tuple]:
    if region and region != "All":
        return f" AND {alias}.country_code IN (SELECT code FROM countries WHERE region = ?)", (region,)
    return "", ()


def _period_stats(months: list[str], region: str | None) -> dict:
    if not months:
        return {"revenue": 0, "orders": 0, "customers": 0, "aov": 0, "repeat_rate": 0, "conversion": 0}
    ph = ",".join("?" * len(months))
    rc, rp = _region_clause(region)
    r = query(
        f"""SELECT ROUND(SUM(revenue_usd),2) revenue, COUNT(*) orders,
                   COUNT(DISTINCT customer_id) customers, AVG(is_repeat) repeat_share
            FROM orders o WHERE order_month IN ({ph}){rc}""",
        tuple(months) + rp,
    )[0]
    rc2, rp2 = _region_clause(region, "s")
    s = query(
        f"""SELECT SUM(sessions) sessions, SUM(purchases) purchases FROM sessions_monthly s
            WHERE month IN ({ph}){rc2}""",
        tuple(months) + rp2,
    )[0]
    revenue = r["revenue"] or 0
    orders = r["orders"] or 0
    return {
        "revenue": revenue,
        "orders": orders,
        "customers": r["customers"] or 0,
        "aov": round(revenue / orders, 2) if orders else 0,
        "repeat_rate": round((r["repeat_share"] or 0) * 100, 1),
        "conversion": round((s["purchases"] or 0) / (s["sessions"] or 1) * 100, 2),
    }


def kpis(months: int = 12, region: str | None = None) -> dict:
    cur_m, prev_m = _window(months)
    cur, prev = _period_stats(cur_m, region), _period_stats(prev_m, region)
    out = {}
    for k, v in cur.items():
        p = prev.get(k) or 0
        out[k] = {"value": v, "change": round((v - p) / p * 100, 1) if p else None}
    out["period"] = {"start": cur_m[0], "end": cur_m[-1], "months": len(cur_m)}
    return out


def revenue_trend(region: str | None = None) -> list[dict]:
    rc, rp = _region_clause(region)
    rows = query(
        f"""SELECT o.order_month month, c.region, ROUND(SUM(o.revenue_usd),0) revenue
            FROM orders o JOIN countries c ON c.code = o.country_code
            WHERE 1=1{rc} GROUP BY 1,2 ORDER BY 1""",
        rp,
    )
    by_month: dict[str, dict] = {}
    for r in rows:
        by_month.setdefault(r["month"], {"month": r["month"], "total": 0})
        by_month[r["month"]][r["region"]] = r["revenue"]
        by_month[r["month"]]["total"] += r["revenue"]
    return list(by_month.values())


def country_summary(months: int = 12, region: str | None = None) -> list[dict]:
    cur_m, prev_m = _window(months)
    ph_c, ph_p = ",".join("?" * len(cur_m)), ",".join("?" * len(prev_m))
    region_filter = " AND c.region = ?" if region and region != "All" else ""
    rows = query(
        f"""
        WITH cur AS (
            SELECT country_code, SUM(revenue_usd) revenue, COUNT(*) orders,
                   COUNT(DISTINCT customer_id) customers, AVG(is_repeat) repeat_share
            FROM orders WHERE order_month IN ({ph_c}) GROUP BY 1),
        prev AS (
            SELECT country_code, SUM(revenue_usd) revenue FROM orders
            WHERE order_month IN ({ph_p}) GROUP BY 1),
        sess AS (
            SELECT country_code, SUM(sessions) sessions, SUM(add_to_cart) atc,
                   SUM(checkout) checkout, SUM(purchases) purchases
            FROM sessions_monthly WHERE month IN ({ph_c}) GROUP BY 1)
        SELECT c.code, c.name, c.region, c.currency, c.launched, c.lat, c.lon,
               ROUND(COALESCE(cur.revenue,0),0) revenue, COALESCE(cur.orders,0) orders,
               COALESCE(cur.customers,0) customers,
               ROUND(COALESCE(cur.revenue,0) / NULLIF(cur.orders,0), 2) aov,
               ROUND(COALESCE(cur.repeat_share,0)*100, 1) repeat_rate,
               ROUND((cur.revenue - prev.revenue) / NULLIF(prev.revenue,0) * 100, 1) growth,
               ROUND(sess.purchases * 100.0 / NULLIF(sess.sessions,0), 2) conversion,
               ROUND(sess.checkout * 100.0 / NULLIF(sess.atc,0), 1) cart_to_checkout
        FROM countries c
        LEFT JOIN cur ON cur.country_code = c.code
        LEFT JOIN prev ON prev.country_code = c.code
        LEFT JOIN sess ON sess.country_code = c.code
        WHERE 1=1{region_filter}
        ORDER BY revenue DESC
        """,
        tuple(cur_m) + tuple(prev_m) + tuple(cur_m) + ((region,) if region_filter else ()),
    )
    total = sum(r["revenue"] for r in rows) or 1
    for r in rows:
        r["share"] = round(r["revenue"] / total * 100, 1)
    return rows


def cohorts(region: str | None = None, n_cohorts: int = 12, n_periods: int = 7) -> list[dict]:
    rc, rp = _region_clause(region, "cu")
    rows = query(
        f"""
        WITH first AS (SELECT customer_id, first_order_month FROM customers cu WHERE 1=1{rc}),
        activity AS (
            SELECT f.first_order_month cohort,
                   (CAST(substr(o.order_month,1,4) AS INT) - CAST(substr(f.first_order_month,1,4) AS INT)) * 12
                 + (CAST(substr(o.order_month,6,2) AS INT) - CAST(substr(f.first_order_month,6,2) AS INT)) period,
                   o.customer_id
            FROM orders o JOIN first f ON f.customer_id = o.customer_id)
        SELECT cohort, period, COUNT(DISTINCT customer_id) n FROM activity
        WHERE period < ? GROUP BY 1,2 ORDER BY 1,2
        """,
        rp + (n_periods,),
    )
    table: dict[str, dict] = {}
    for r in rows:
        table.setdefault(r["cohort"], {})[r["period"]] = r["n"]
    all_cohorts = sorted(table)[-(n_cohorts + n_periods - 1):-(n_periods - 1) or None]
    out = []
    for c in all_cohorts:
        size = table[c].get(0, 0)
        out.append({
            "cohort": c, "size": size,
            "retention": [round(table[c].get(p, 0) / size * 100, 1) if size else 0 for p in range(n_periods)],
        })
    return out


def funnel(months: int = 12, region: str | None = None) -> list[dict]:
    cur_m, _ = _window(months)
    ph = ",".join("?" * len(cur_m))
    rc, rp = _region_clause(region, "s")
    r = query(
        f"""SELECT SUM(sessions) sessions, SUM(add_to_cart) add_to_cart, SUM(checkout) checkout,
                   SUM(purchases) purchases FROM sessions_monthly s WHERE month IN ({ph}){rc}""",
        tuple(cur_m) + rp,
    )[0]
    steps = [("Sessions", "sessions"), ("Added to cart", "add_to_cart"),
             ("Reached checkout", "checkout"), ("Purchased", "purchases")]
    base = r["sessions"] or 1
    return [{"step": label, "value": r[key] or 0, "pct": round((r[key] or 0) / base * 100, 2)}
            for label, key in steps]


def channels(months: int = 12, region: str | None = None) -> list[dict]:
    cur_m, _ = _window(months)
    ph = ",".join("?" * len(cur_m))
    rc, rp = _region_clause(region)
    return query(
        f"""SELECT cu.channel, ROUND(SUM(o.revenue_usd),0) revenue, COUNT(DISTINCT o.customer_id) customers,
                   ROUND(SUM(o.revenue_usd) / COUNT(DISTINCT o.customer_id), 2) revenue_per_customer
            FROM orders o JOIN customers cu ON cu.customer_id = o.customer_id
            WHERE o.order_month IN ({ph}){rc} GROUP BY 1 ORDER BY 2 DESC""",
        tuple(cur_m) + rp,
    )


def categories(months: int = 12, region: str | None = None) -> list[dict]:
    cur_m, _ = _window(months)
    ph = ",".join("?" * len(cur_m))
    rc, rp = _region_clause(region)
    return query(
        f"""SELECT category, ROUND(SUM(revenue_usd),0) revenue, COUNT(*) orders
            FROM orders o WHERE order_month IN ({ph}){rc} GROUP BY 1 ORDER BY 2 DESC""",
        tuple(cur_m) + rp,
    )


def market_factors() -> list[dict]:
    """Raw 0-100 factors per country. The frontend weights them into the attractiveness score."""
    rows = country_summary(12)
    def norm(vals, v):
        lo, hi = min(vals), max(vals)
        return round((v - lo) / (hi - lo) * 100, 1) if hi > lo else 50.0
    import math
    info = {r["code"]: r for r in query("SELECT * FROM countries")}
    size_raw = {c: math.log(i["population_m"] * i["gdp_per_capita"]) for c, i in info.items()}
    out = []
    growths = [r["growth"] for r in rows if r["growth"] is not None]
    for r in rows:
        i = info[r["code"]]
        if r["launched"]:
            perf = norm(growths, r["growth"] or 0) * 0.6 + min(100, (r["repeat_rate"] or 0) * 2.5) * 0.4
        else:
            perf = None
        out.append({
            "code": r["code"], "name": r["name"], "region": r["region"], "launched": bool(r["launched"]),
            "market_size": norm(list(size_raw.values()), size_raw[r["code"]]),
            "digital_adoption": round(i["internet_pct"], 1),
            "search_demand": round(i["search_index"], 1),
            "affluence": norm([x["gdp_per_capita"] for x in info.values()], i["gdp_per_capita"]),
            "performance": round(perf, 1) if perf is not None else None,
            "revenue": r["revenue"], "growth": r["growth"],
        })
    return out


def regions() -> list[str]:
    return [r["region"] for r in query("SELECT DISTINCT region FROM countries ORDER BY region")]


def overview(months: int = 12, region: str | None = None) -> dict:
    return {
        "kpis": kpis(months, region),
        "trend": revenue_trend(region),
        "countries": country_summary(months, region),
        "funnel": funnel(months, region),
        "channels": channels(months, region),
        "categories": categories(months, region),
    }
