import { MLAnomaly, MLForecastResult, Transaction } from '../types/budget';

export async function fetchSpendingForecast(
  transactions: Transaction[],
  budget: number,
  year: number,
  month: number
): Promise<MLForecastResult> {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const currentDay = isCurrentMonth ? today.getDate() : daysInMonth;

  // Aggregate daily expenses for the target month
  const dailyMap: Record<number, number> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    dailyMap[d] = 0;
  }

  transactions.forEach((tx) => {
    if (tx.type === 'expense') {
      const txDate = new Date(tx.date + 'T00:00:00');
      if (txDate.getFullYear() === year && txDate.getMonth() === month) {
        const d = txDate.getDate();
        if (d >= 1 && d <= daysInMonth) {
          dailyMap[d] = (dailyMap[d] || 0) + Math.abs(tx.amount);
        }
      }
    }
  });

  const daily_spending = [];
  for (let d = 1; d <= (isCurrentMonth ? currentDay : daysInMonth); d++) {
    daily_spending.push({ day: d, amount: dailyMap[d] || 0 });
  }

  try {
    const res = await fetch('/api/ml/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        daily_spending,
        days_in_month: daysInMonth,
        current_day: currentDay,
        budget,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data) return json.data;
    }
  } catch (err) {
    console.warn('ML forecast API error, computing client estimate:', err);
  }

  // Client calculation fallback
  const spentSoFar = daily_spending.reduce((acc, curr) => acc + curr.amount, 0);
  const pace = currentDay > 0 ? spentSoFar / currentDay : 0;
  const projected = spentSoFar + pace * (daysInMonth - currentDay);
  const variance = projected - budget;

  const curve = [];
  let cum = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    if (d <= currentDay) {
      cum += dailyMap[d] || 0;
      curve.push({ day: d, actual: cum, forecast: cum, is_projected: false });
    } else {
      const projectedEst = cum + pace * (d - currentDay);
      curve.push({ day: d, actual: null, forecast: Math.round(projectedEst * 100) / 100, is_projected: true });
    }
  }

  return {
    spent_so_far: Math.round(spentSoFar * 100) / 100,
    projected_total: Math.round(projected * 100) / 100,
    daily_burn_rate: Math.round(pace * 100) / 100,
    days_remaining: Math.max(0, daysInMonth - currentDay),
    projected_variance: Math.round(variance * 100) / 100,
    burn_status: variance <= 0 ? 'on_track' : variance < budget * 0.1 ? 'near_limit' : 'over_budget',
    recommended_daily_cap: Math.round(Math.max(0, (budget - spentSoFar) / Math.max(1, daysInMonth - currentDay)) * 100) / 100,
    curve,
  };
}

export async function predictCategoryWithML(
  description: string,
  amount: number
): Promise<{ predictedCategory: string; confidence: number }> {
  try {
    const res = await fetch('/api/ml/categorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, amount }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        return {
          predictedCategory: json.data.predicted_category,
          confidence: json.data.confidence,
        };
      }
    }
  } catch (err) {
    console.warn('ML categorize request error:', err);
  }

  // Local fallback
  const d = description.toLowerCase();
  if (d.includes('uber') || d.includes('lyft') || d.includes('gas') || d.includes('shell')) {
    return { predictedCategory: 'Transportation', confidence: 0.85 };
  }
  if (d.includes('whole foods') || d.includes('trader joe') || d.includes('market') || d.includes('grocer')) {
    return { predictedCategory: 'Groceries & Food', confidence: 0.9 };
  }
  if (d.includes('starbucks') || d.includes('coffee') || d.includes('restaurant') || d.includes('burger')) {
    return { predictedCategory: 'Dining & Drinks', confidence: 0.85 };
  }
  return { predictedCategory: 'General Expenses', confidence: 0.5 };
}

export async function detectSpendingAnomalies(transactions: Transaction[]): Promise<MLAnomaly[]> {
  try {
    const res = await fetch('/api/ml/anomalies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.anomalies) {
        return json.data.anomalies;
      }
    }
  } catch (err) {
    console.warn('ML anomalies error:', err);
  }
  return [];
}

export async function fetchSpendingInsights(
  transactions: Transaction[],
  savingsTarget: number,
  netSavings: number
): Promise<{
  subscriptions: Array<{ name: string; monthly_cost: number; frequency: string }>;
  recurring_monthly_total: number;
  insights: Array<{ type: string; title: string; message: string }>;
}> {
  try {
    const res = await fetch('/api/ml/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions, savings_target: savingsTarget, net_savings: netSavings }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) return json.data;
    }
  } catch (err) {
    console.warn('ML insights error:', err);
  }
  return {
    subscriptions: [],
    recurring_monthly_total: 0,
    insights: [],
  };
}
