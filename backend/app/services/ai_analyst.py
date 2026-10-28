"""
AI Senior Analyst.

Claude answers business questions by writing SQL against the read-only warehouse,
checking the numbers, and replying like a senior data analyst: the answer first,
then the evidence, caveats and a recommended action. Every query it ran is returned
so the user can audit the answer.
"""
from __future__ import annotations

import json
import os

from ..db import SCHEMA_DOC, safe_select
from . import analytics

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5-5")
MAX_STEPS = 8

SYSTEM_PROMPT = f"""You are the Senior Data Analyst inside MarketLens, a global e-commerce market
intelligence platform for a D2C beauty and personal-care brand selling in 18 countries.

How you work:
- Never guess a number. Use the run_sql tool to get every figure you quote. Check totals add up.
- Break questions down the way a senior analyst would: size the effect, compare against a
  baseline (previous period, other markets, region average), then look for the driver
  (conversion, AOV, repeat rate, channel, category, seasonality, currency).
- If the data cannot answer the question, say exactly what is missing and what you would need.
- When a chart would make the answer clearer, call show_chart once with a small dataset.

How you answer (Markdown, concise):
1. **Answer** in one or two sentences with the key number.
2. **What the data shows**: 2-4 bullets with specific figures and comparisons.
3. **Why it matters / likely drivers**, separating evidence from hypothesis.
4. **Recommended next step**: one or two concrete actions with the metric to watch.
Mention caveats (small samples, seasonality, demo data) briefly when relevant.

Database schema:
{SCHEMA_DOC}
SQLite dialect: use strftime / substr for dates. Always alias aggregates. Limit result sets.
"""

TOOLS = [
    {
        "name": "run_sql",
        "description": "Run one read-only SQLite SELECT query against the MarketLens warehouse. "
                       "Returns up to 200 rows as JSON.",
        "input_schema": {
            "type": "object",
            "properties": {
                "sql": {"type": "string", "description": "A single SELECT or WITH query."},
                "purpose": {"type": "string", "description": "One line on what this query checks."},
            },
            "required": ["sql", "purpose"],
        },
    },
    {
        "name": "show_chart",
        "description": "Display a chart next to your answer. Keep it to at most 24 data points.",
        "input_schema": {
            "type": "object",
            "properties": {
                "type": {"type": "string", "enum": ["bar", "line"]},
                "title": {"type": "string"},
                "x_key": {"type": "string"},
                "y_keys": {"type": "array", "items": {"type": "string"}},
                "data": {"type": "array", "items": {"type": "object"}},
            },
            "required": ["type", "title", "x_key", "y_keys", "data"],
        },
    },
]


def ask(messages: list[dict]) -> dict:
    """messages: [{role: 'user'|'assistant', content: str}, ...]"""
    if not os.getenv("ANTHROPIC_API_KEY"):
        return _demo_answer(messages[-1]["content"] if messages else "")

    import anthropic

    client = anthropic.Anthropic()
    convo = [{"role": m["role"], "content": m["content"]} for m in messages[-12:]]
    queries: list[dict] = []
    chart = None

    for _ in range(MAX_STEPS):
        resp = client.messages.create(
            model=MODEL, max_tokens=2000, system=SYSTEM_PROMPT, tools=TOOLS, messages=convo
        )
        convo.append({"role": "assistant", "content": resp.content})
        if resp.stop_reason != "tool_use":
            text = "".join(b.text for b in resp.content if b.type == "text").strip()
            return {"answer": text, "queries": queries, "chart": chart, "mode": "ai"}

        results = []
        for block in resp.content:
            if block.type != "tool_use":
                continue
            if block.name == "run_sql":
                sql = block.input.get("sql", "")
                try:
                    rows = safe_select(sql)
                    queries.append({"sql": sql, "purpose": block.input.get("purpose", ""), "rows": len(rows)})
                    content = json.dumps(rows, default=str)[:15000]
                    is_error = False
                except Exception as exc:  # return the error so the model can fix its query
                    content, is_error = f"SQL error: {exc}", True
                results.append({"type": "tool_result", "tool_use_id": block.id,
                                "content": content, "is_error": is_error})
            elif block.name == "show_chart":
                chart = {k: block.input.get(k) for k in ("type", "title", "x_key", "y_keys", "data")}
                results.append({"type": "tool_result", "tool_use_id": block.id, "content": "Chart shown."})
        convo.append({"role": "user", "content": results})

    return {"answer": "I hit my analysis step limit before finishing. Try a narrower question, "
                      "for example one market or one metric.",
            "queries": queries, "chart": chart, "mode": "ai"}


def write_narrative(context: dict) -> dict | None:
    """Ask Claude for an executive summary and recommendations for a report. None if no API key."""
    if not os.getenv("ANTHROPIC_API_KEY"):
        return None
    import anthropic

    client = anthropic.Anthropic()
    prompt = (
        "Write the narrative for a market performance report as a senior data analyst. "
        "Use only the figures in this JSON. Return JSON only, no preamble, shaped as "
        '{"summary": "3-4 sentence executive summary", "insights": ["4 specific insights with numbers"], '
        '"recommendations": ["3 concrete actions, each with the metric to watch"]}.\n\n'
        + json.dumps(context, default=str)[:20000]
    )
    resp = client.messages.create(model=MODEL, max_tokens=1500,
                                  messages=[{"role": "user", "content": prompt}])
    text = "".join(b.text for b in resp.content if b.type == "text")
    text = text.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


# ---------------------------------------------------------------- demo mode (no API key)

def _demo_answer(question: str) -> dict:
    q = question.lower()
    countries = [c for c in analytics.country_summary(12) if c["launched"]]
    k = analytics.kpis(12)

    if any(w in q for w in ("retention", "repeat", "churn", "loyal")):
        ranked = sorted(countries, key=lambda c: c["repeat_rate"], reverse=True)
        top, low = ranked[:3], ranked[-3:]
        answer = (
            f"**Answer:** Repeat orders make up **{k['repeat_rate']['value']}%** of orders over the last 12 months. "
            f"{top[0]['name']} leads at {top[0]['repeat_rate']}%, while {low[-1]['name']} trails at {low[-1]['repeat_rate']}%.\n\n"
            "**What the data shows**\n"
            + "".join(f"- {c['name']}: {c['repeat_rate']}% repeat share, AOV ${c['aov']}\n" for c in top)
            + "".join(f"- {c['name']}: {c['repeat_rate']}% repeat share, AOV ${c['aov']}\n" for c in low)
            + "\n**Likely drivers:** lower-loyalty markets also convert worse at checkout, which points to "
              "delivery cost and time rather than product fit (hypothesis to test).\n\n"
              "**Recommended next step:** run a second-order incentive in the bottom three markets and track "
              "60-day repeat rate against a holdout group."
        )
        chart = {"type": "bar", "title": "Repeat order share by market (%)", "x_key": "market",
                 "y_keys": ["repeat_rate"], "data": [{"market": c["code"], "repeat_rate": c["repeat_rate"]} for c in ranked]}
        sql = "SELECT country_code, AVG(is_repeat)*100 AS repeat_rate FROM orders GROUP BY 1 ORDER BY 2 DESC"
    elif any(w in q for w in ("expand", "expansion", "new market", "launch", "enter")):
        factors = [f for f in analytics.market_factors() if not f["launched"]]
        for f in factors:
            f["score"] = round(0.35 * f["market_size"] + 0.25 * f["digital_adoption"] + 0.25 * f["search_demand"] + 0.15 * f["affluence"], 1)
        factors.sort(key=lambda f: f["score"], reverse=True)
        answer = (
            f"**Answer:** {factors[0]['name']} is the strongest expansion candidate with an attractiveness score of "
            f"**{factors[0]['score']}**, followed by {factors[1]['name']} ({factors[1]['score']}).\n\n"
            "**What the data shows**\n"
            + "".join(f"- {f['name']}: size {f['market_size']}, digital {f['digital_adoption']}, search demand {f['search_demand']}\n" for f in factors)
            + "\n**Why it matters:** search demand and digital adoption predict how fast a new market reaches "
              "break-even on paid acquisition.\n\n**Recommended next step:** run a 90-day marketplace pilot in the "
              "top market before committing to local fulfilment; watch CAC and first-90-day repeat rate."
        )
        chart = {"type": "bar", "title": "Expansion attractiveness score", "x_key": "market", "y_keys": ["score"],
                 "data": [{"market": f["name"], "score": f["score"]} for f in factors]}
        sql = "SELECT code, name, population_m, gdp_per_capita, internet_pct, search_index FROM countries WHERE launched = 0"
    elif any(w in q for w in ("conversion", "funnel", "checkout", "cart")):
        ranked = sorted(countries, key=lambda c: c["conversion"] or 0)
        answer = (
            f"**Answer:** Overall conversion is **{k['conversion']['value']}%**. The weakest markets are "
            f"{ranked[0]['name']} ({ranked[0]['conversion']}%) and {ranked[1]['name']} ({ranked[1]['conversion']}%).\n\n"
            "**What the data shows**\n"
            + "".join(f"- {c['name']}: {c['conversion']}% conversion, {c['cart_to_checkout']}% of carts reach checkout\n" for c in ranked[:4])
            + "\n**Likely drivers:** the drop happens between cart and checkout, which usually means shipping cost "
              "surprises or missing local payment methods.\n\n**Recommended next step:** add local payment options "
              "and show delivery cost on the product page; watch cart-to-checkout rate weekly."
        )
        chart = {"type": "bar", "title": "Conversion rate by market (%)", "x_key": "market", "y_keys": ["conversion"],
                 "data": [{"market": c["code"], "conversion": c["conversion"]} for c in ranked]}
        sql = "SELECT country_code, SUM(purchases)*100.0/SUM(sessions) AS conversion FROM sessions_monthly GROUP BY 1"
    else:
        top = countries[:5]
        fastest = max(countries, key=lambda c: c["growth"] or 0)
        answer = (
            f"**Answer:** Revenue for the last 12 months is **${k['revenue']['value']:,.0f}**, "
            f"{k['revenue']['change']:+}% versus the prior 12 months. {fastest['name']} is the fastest-growing market "
            f"at {fastest['growth']:+}%.\n\n**What the data shows**\n"
            + "".join(f"- {c['name']}: ${c['revenue']:,.0f} ({c['share']}% of revenue), growth {c['growth']:+}%\n" for c in top)
            + "\n**Why it matters:** the top five markets drive most revenue, so a slowdown in any one of them "
              "moves the total.\n\n**Recommended next step:** shift incremental budget toward high-growth, "
              "high-repeat markets and review the slowest movers' funnels."
        )
        chart = {"type": "bar", "title": "Revenue by market, last 12 months (USD)", "x_key": "market",
                 "y_keys": ["revenue"], "data": [{"market": c["code"], "revenue": c["revenue"]} for c in countries[:10]]}
        sql = "SELECT country_code, SUM(revenue_usd) AS revenue FROM orders WHERE order_month >= '2025-10' GROUP BY 1 ORDER BY 2 DESC"

    answer += "\n\n_Demo mode: add an ANTHROPIC_API_KEY to the backend for full AI analysis of any question._"
    return {"answer": answer, "queries": [{"sql": sql, "purpose": "Demo-mode query", "rows": None}],
            "chart": chart, "mode": "demo"}
