#!/usr/bin/env python3
"""
KashFlow Machine Learning & Financial Data Processing Engine
Performs time-series forecasting, smart transaction categorization,
statistical anomaly detection, and recurring expense pattern recognition.
"""

import sys
import json
import math
import re
from datetime import datetime, timedelta

def parse_input():
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            return {}
        return json.loads(raw)
    except Exception as e:
        sys.stderr.write(f"Error parsing stdin JSON: {e}\n")
        return {}

def linear_regression(x_vals, y_vals):
    n = len(x_vals)
    if n < 2:
        return 0.0, (y_vals[0] if y_vals else 0.0)
    sum_x = sum(x_vals)
    sum_y = sum(y_vals)
    sum_xy = sum(x * y for x, y in zip(x_vals, y_vals))
    sum_xx = sum(x * x for x in x_vals)
    denominator = (n * sum_xx - sum_x * sum_x)
    if denominator == 0:
        return 0.0, sum_y / n
    slope = (n * sum_xy - sum_x * sum_y) / denominator
    intercept = (sum_y - slope * sum_x) / n
    return slope, intercept

def handle_forecast(data):
    # Expects data: { daily_spending: [{ day: int, amount: float }], days_in_month: int, current_day: int, budget: float }
    daily = data.get("daily_spending", [])
    days_in_month = int(data.get("days_in_month", 30))
    current_day = int(data.get("current_day", len(daily) or 15))
    monthly_budget = float(data.get("budget", 3000.0))

    if not daily:
        # Default mock projection
        spent_so_far = 0.0
        projected = 0.0
        pace = 0.0
    else:
        spent_so_far = sum(float(item.get("amount", 0)) for item in daily)
        pace = (spent_so_far / current_day) if current_day > 0 else 0
        projected = spent_so_far + pace * (days_in_month - current_day)

    # Calculate trend slope using cumulative curve
    cum_x = []
    cum_y = []
    running = 0.0
    for idx, item in enumerate(daily):
        day_num = item.get("day", idx + 1)
        running += float(item.get("amount", 0))
        cum_x.append(day_num)
        cum_y.append(running)

    slope, intercept = linear_regression(cum_x, cum_y) if cum_x else (0.0, 0.0)
    
    # Generate daily curve projection
    forecast_curve = []
    accum = 0.0
    for d in range(1, days_in_month + 1):
        if d <= current_day and d <= len(daily):
            accum += float(daily[d - 1].get("amount", 0))
            forecast_curve.append({
                "day": d,
                "actual": round(accum, 2),
                "forecast": round(accum, 2),
                "is_projected": False
            })
        else:
            projected_day_val = max(accum, intercept + slope * d)
            # Add subtle smoothing
            accum_projected = accum + pace * (d - current_day)
            forecast_val = round((projected_day_val * 0.4 + accum_projected * 0.6), 2)
            forecast_curve.append({
                "day": d,
                "actual": None,
                "forecast": forecast_val,
                "is_projected": True
            })

    variance = projected - monthly_budget
    burn_status = "on_track" if variance <= 0 else ("near_limit" if variance < monthly_budget * 0.1 else "over_budget")

    return {
        "spent_so_far": round(spent_so_far, 2),
        "projected_total": round(projected, 2),
        "daily_burn_rate": round(pace, 2),
        "days_remaining": max(0, days_in_month - current_day),
        "projected_variance": round(variance, 2),
        "burn_status": burn_status,
        "recommended_daily_cap": round(max(0, (monthly_budget - spent_so_far) / max(1, days_in_month - current_day)), 2),
        "curve": forecast_curve
    }

def handle_categorize(data):
    # Expects { description: str, amount: float }
    description = str(data.get("description", "")).lower().strip()
    
    # Rule-based NLP pattern match weights
    patterns = {
        "Housing & Rent": [r"rent", r"mortgage", r"landlord", r"realty", r"lease", r"hoa"],
        "Groceries & Food": [r"trader joe", r"whole foods", r"safeway", r"kroger", r"walmart", r"costco", r"grocery", r"supermarket", r"market", r"albertsons", r"target"],
        "Dining & Drinks": [r"starbucks", r"mcdonald", r"chipotle", r"restaurant", r"cafe", r"coffee", r"bar", r"pub", r"bistro", r"grill", r"doordash", r"uber\s*eats", r"grubhub"],
        "Transportation": [r"uber", r"lyft", r"subway", r"metro", r"transit", r"gas", r"chevron", r"shell", r"exxon", r"bp", r"parking", r"toll", r"tesla supercharger"],
        "Utilities & Bills": [r"electric", r"water", r"power", r"gas co", r"coned", r"att", r"verizon", r"t-mobile", r"comcast", r"xfinity", r"internet", r"utility"],
        "Entertainment & Subs": [r"netflix", r"spotify", r"hulu", r"disney", r"apple\s*music", r"hbo", r"youtube", r"cinema", r"theatre", r"steam", r"playstation", r"nintendo"],
        "Health & Wellness": [r"pharmacy", r"cvs", r"walgreens", r"doctor", r"dentist", r"clinic", r"gym", r"fitness", r"equinox", r"peloton", r"hospital"],
        "Shopping": [r"amazon", r"zara", r"nike", r"clothing", r"shoes", r"department", r"apple\.com", r"best buy", r"ikea", r"nordstrom"],
        "Income": [r"payroll", r"direct dep", r"salary", r"employer", r"freelance", r"dividend", r"interest", r"venmo cashout"]
    }

    matched_category = "General Expenses"
    confidence = 0.50

    for cat, regex_list in patterns.items():
        for reg in regex_list:
            if re.search(reg, description):
                matched_category = cat
                confidence = 0.92
                break
        if confidence > 0.8:
            break

    return {
        "description": data.get("description", ""),
        "predicted_category": matched_category,
        "confidence": confidence
    }

def handle_anomalies(data):
    # Expects { transactions: [{ id, amount, category, date, description }] }
    txns = data.get("transactions", [])
    if not txns:
        return {"anomalies": []}

    # Group by category
    by_category = {}
    for t in txns:
        c = t.get("category", "General")
        amt = abs(float(t.get("amount", 0)))
        if amt > 0:
            by_category.setdefault(c, []).append((amt, t))

    anomalies = []
    for cat, items in by_category.items():
        if len(items) < 3:
            # Check individual absolute threshold
            for amt, t in items:
                if amt > 400 and cat not in ["Housing & Rent", "Income"]:
                    anomalies.append({
                        "transaction_id": t.get("id"),
                        "description": t.get("description"),
                        "amount": amt,
                        "category": cat,
                        "reason": f"High single purchase exceeding category standard ($400)",
                        "severity": "medium"
                    })
            continue

        amts = [x[0] for x in items]
        mean_val = sum(amts) / len(amts)
        variance = sum((x - mean_val) ** 2 for x in amts) / len(amts)
        std_dev = math.sqrt(variance) if variance > 0 else 1.0

        for amt, t in items:
            z_score = (amt - mean_val) / std_dev if std_dev > 0 else 0
            if z_score >= 2.2 and amt > mean_val * 1.8 and cat not in ["Housing & Rent"]:
                severity = "high" if z_score >= 3.0 else "medium"
                anomalies.append({
                    "transaction_id": t.get("id"),
                    "description": t.get("description"),
                    "amount": amt,
                    "category": cat,
                    "reason": f"Spending is {round(z_score, 1)}σ above average for {cat} (typical ~${round(mean_val, 2)})",
                    "severity": severity
                })

    return {"anomalies": anomalies}

def handle_insights(data):
    # Detect recurring subscriptions and calculate spending diversity
    txns = data.get("transactions", [])
    total_spent = sum(abs(float(t.get("amount", 0))) for t in txns if float(t.get("amount", 0)) < 0)
    
    # Subscriptions heuristic
    subs = []
    seen = {}
    for t in txns:
        desc = t.get("description", "").lower().strip()
        amt = abs(float(t.get("amount", 0)))
        key = (desc, round(amt, 2))
        seen[key] = seen.get(key, 0) + 1

    recurring_est = 0.0
    for (desc, amt), count in seen.items():
        if count >= 2 and any(k in desc for k in ["netflix", "spotify", r"sub", "cloud", "gym", "membership", "prime", "mobile", "utility"]):
            monthly_cost = amt
            recurring_est += monthly_cost
            subs.append({
                "name": desc.title(),
                "monthly_cost": round(monthly_cost, 2),
                "frequency": "Monthly"
            })

    insights = []
    if recurring_est > 0:
        insights.append({
            "type": "recurring",
            "title": "Subscription Audit",
            "message": f"Identified ${round(recurring_est, 2)}/month in recurring subscriptions ({len(subs)} detected). Reviewing unused services could save up to ${round(recurring_est * 0.25, 2)} monthly."
        })

    if total_spent > 0:
        savings_target = float(data.get("savings_target", 500.0))
        net_savings = float(data.get("net_savings", 750.0))
        if net_savings >= savings_target:
            insights.append({
                "type": "positive",
                "title": "Savings Goal On Pace",
                "message": f"You have saved ${round(net_savings, 2)} this cycle, exceeding your target of ${round(savings_target, 2)}."
            })
        else:
            deficit = savings_target - net_savings
            insights.append({
                "type": "warning",
                "title": "Savings Deficit Warning",
                "message": f"Currently ${round(deficit, 2)} under your monthly savings target. Cutting non-essential dining/shopping by 15% closes the gap."
            })

    return {
        "subscriptions": subs,
        "recurring_monthly_total": round(recurring_est, 2),
        "insights": insights
    }

def main():
    action = sys.argv[1] if len(sys.argv) > 1 else "forecast"
    payload = parse_input()

    if action == "forecast":
        res = handle_forecast(payload)
    elif action == "categorize":
        res = handle_categorize(payload)
    elif action == "anomalies":
        res = handle_anomalies(payload)
    elif action == "insights":
        res = handle_insights(payload)
    else:
        res = {"error": f"Unknown action: {action}"}

    print(json.dumps(res))

if __name__ == "__main__":
    main()
