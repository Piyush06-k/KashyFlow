import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Sparkles,
  AlertTriangle,
  Printer,
  ChevronLeft,
  ChevronRight,
  PieChart,
  TrendingDown,
  Layers,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { Category, MLAnomaly, MLForecastResult, Transaction } from '../types/budget';
import { formatMoney, getCurrencySymbol } from '../services/currencyService';

interface BudgetsReportsViewProps {
  transactions: Transaction[];
  categories: Category[];
  monthlyBudget: number;
  forecast: MLForecastResult | null;
  anomalies: MLAnomaly[];
  onOpenPrintReport: (year: number, month: number) => void;
  currency?: string;
}

export const BudgetsReportsView: React.FC<BudgetsReportsViewProps> = ({
  transactions,
  categories,
  monthlyBudget,
  forecast,
  anomalies,
  onOpenPrintReport,
  currency = 'INR',
}) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Filter transactions for chosen month
  const monthTxns = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date + 'T00:00:00');
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
  }, [transactions, selectedYear, selectedMonth]);

  const totalIncome = useMemo(() => {
    return monthTxns
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [monthTxns]);

  const totalExpense = useMemo(() => {
    return monthTxns
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [monthTxns]);

  // Group by category
  const categoryStats = useMemo(() => {
    const map: Record<string, { spent: number; count: number }> = {};
    monthTxns.forEach((t) => {
      if (t.type === 'expense') {
        if (!map[t.category]) map[t.category] = { spent: 0, count: 0 };
        map[t.category].spent += Math.abs(t.amount);
        map[t.category].count += 1;
      }
    });

    return categories.map((cat) => {
      const spent = map[cat.name]?.spent || 0;
      const count = map[cat.name]?.count || 0;
      const pctOfBudget = cat.budgetLimit > 0 ? (spent / cat.budgetLimit) * 100 : 0;
      const pctOfTotalSpend = totalExpense > 0 ? (spent / totalExpense) * 100 : 0;
      const variance = cat.budgetLimit - spent;

      return {
        ...cat,
        spent,
        count,
        pctOfBudget,
        pctOfTotalSpend,
        variance,
      };
    }).sort((a, b) => b.spent - a.spent);
  }, [monthTxns, categories, totalExpense]);

  // Max value for SVG forecast chart
  const maxForecastValue = useMemo(() => {
    let maxVal = monthlyBudget;
    if (forecast?.curve) {
      forecast.curve.forEach((pt) => {
        if (pt.actual && pt.actual > maxVal) maxVal = pt.actual;
        if (pt.forecast && pt.forecast > maxVal) maxVal = pt.forecast;
      });
    }
    return Math.max(maxVal * 1.15, 1000);
  }, [forecast, monthlyBudget]);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. Header with Month Navigator & PDF Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
            Monthly Spending & Variance Report
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Comprehensive audit, category allocations & regression trajectory
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month Selector Carousel */}
          <div className="flex items-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-1 shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-600 dark:text-neutral-400 cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-semibold text-neutral-900 dark:text-white min-w-[130px] text-center">
              {monthNames[selectedMonth]} {selectedYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-600 dark:text-neutral-400 cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Export Printable PDF Report */}
          <button
            onClick={() => onOpenPrintReport(selectedYear, selectedMonth)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Export PDF</span>
          </button>
        </div>
      </div>

      {/* 2. Top Spending Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
          <div className="text-xs text-neutral-500 font-medium">Monthly Inflow (Income)</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {formatMoney(totalIncome, currency, { showSign: true })}
          </div>
          <div className="text-[11px] text-neutral-400 mt-2">
            Verified cash receipts in {monthNames[selectedMonth]}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
          <div className="text-xs text-neutral-500 font-medium">Total Outflow (Actual Spend)</div>
          <div className="text-2xl font-bold font-mono text-neutral-950 dark:text-white mt-1 tabular-nums">
            {formatMoney(totalExpense, currency)}
          </div>
          <div className="text-[11px] text-neutral-400 mt-2 flex items-center gap-1">
            <span>Overall Budget Limit:</span>
            <strong className="text-neutral-700 dark:text-neutral-300 font-mono">{formatMoney(monthlyBudget, currency)}</strong>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
          <div className="text-xs text-neutral-500 font-medium">Net Savings & Discretionary Margin</div>
          <div className={`text-2xl font-bold font-mono mt-1 tabular-nums ${totalIncome - totalExpense >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
            {formatMoney(totalIncome - totalExpense, currency, { showSign: false })}
          </div>
          <div className="text-[11px] text-neutral-400 mt-2">
            Savings Rate: {totalIncome > 0 ? (((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1) : '0.0'}%
          </div>
        </div>
      </div>

      {/* 3. Forecast Curve SVG Chart */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-950 dark:text-white">
                Daily Cumulative Spending & Forecast Trajectory
              </h2>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Cumulative actual expenditures (green solid) vs projected month-end trajectory (blue dashed)
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-emerald-500" />
              <span className="text-neutral-600 dark:text-neutral-400">Actual Spend</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 border-t border-dashed border-blue-400" />
              <span className="text-neutral-600 dark:text-neutral-400">Projected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 border-t border-rose-500" />
              <span className="text-neutral-600 dark:text-neutral-400">Budget Limit</span>
            </div>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="pt-6">
          <div className="h-64 w-full relative">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 800 240" preserveAspectRatio="none">
              <defs>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                const y = 220 - pct * 200;
                return (
                  <g key={pct}>
                    <line x1="40" y1={y} x2="790" y2={y} stroke="currentColor" className="text-neutral-100 dark:text-neutral-800" strokeWidth="1" />
                    <text x="35" y={y + 4} textAnchor="end" className="text-[10px] fill-neutral-400 font-mono">
                      {formatMoney(Math.round(pct * maxForecastValue), currency, { compact: true, decimals: 0 })}
                    </text>
                  </g>
                );
              })}

              {/* Budget Limit Line */}
              {(() => {
                const budgetY = 220 - (monthlyBudget / maxForecastValue) * 200;
                return (
                  <line
                    x1="40"
                    y1={budgetY}
                    x2="790"
                    y2={budgetY}
                    stroke="#EF4444"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                );
              })()}

              {/* Curve rendering */}
              {forecast?.curve && forecast.curve.length > 0 && (() => {
                const points = forecast.curve;
                const stepX = (790 - 40) / Math.max(1, points.length - 1);

                // Build actual points string
                const actualPoints = points
                  .filter((p) => p.actual !== null)
                  .map((p, idx) => {
                    const x = 40 + (p.day - 1) * stepX;
                    const y = 220 - ((p.actual || 0) / maxForecastValue) * 200;
                    return `${x},${y}`;
                  });

                // Build forecast path
                const forecastPoints = points.map((p) => {
                  const x = 40 + (p.day - 1) * stepX;
                  const val = p.actual !== null ? p.actual : p.forecast;
                  const y = 220 - (val / maxForecastValue) * 200;
                  return `${x},${y}`;
                });

                return (
                  <g>
                    {/* Forecast projection line */}
                    <polyline
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                      points={forecastPoints.join(' ')}
                    />

                    {/* Actual spend filled area */}
                    {actualPoints.length > 1 && (
                      <polygon
                        fill="url(#actualGradient)"
                        points={`40,220 ${actualPoints.join(' ')} ${40 + (actualPoints.length - 1) * stepX},220`}
                      />
                    )}

                    {/* Actual spend solid stroke */}
                    {actualPoints.length > 0 && (
                      <polyline
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="2.5"
                        points={actualPoints.join(' ')}
                      />
                    )}
                  </g>
                );
              })()}
            </svg>
          </div>
          <div className="flex justify-between text-[11px] text-neutral-400 font-mono mt-2 px-10">
            <span>Day 1</span>
            <span>Day 10</span>
            <span>Day 20</span>
            <span>Day 30 (Month End)</span>
          </div>
        </div>
      </div>

      {/* 4. Anomaly Detection Feed */}
      {anomalies.length > 0 && (
        <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/80 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
              Unusual Spending Alerts
            </h3>
          </div>
          <p className="text-xs text-amber-900/80 dark:text-amber-300/80 mb-4">
            Noticeable transactions that deviate significantly from your typical spending baselines.
          </p>
          <div className="space-y-2">
            {anomalies.map((anom, i) => (
              <div
                key={i}
                className="bg-white dark:bg-neutral-900 border border-amber-200/80 dark:border-amber-800/60 rounded-lg p-3 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-neutral-900 dark:text-white">
                    {anom.description}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    {anom.reason}
                  </div>
                </div>
                <div className="font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400 text-sm">
                  {formatMoney(anom.amount, currency)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Detailed Category Variance Breakdown */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-5 pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="text-base font-semibold text-neutral-950 dark:text-white">
            Category Spending vs Monthly Budget Variance
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Performance analysis per expense classification
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 text-neutral-400 font-medium">
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Tx Count</th>
                <th className="py-3 px-4 text-right">Actual Spend</th>
                <th className="py-3 px-4 text-right">Budget Target</th>
                <th className="py-3 px-4 text-right">Variance (+ / -)</th>
                <th className="py-3 px-4 text-right">% of Total Spend</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {categoryStats.map((item) => {
                const isOver = item.budgetLimit > 0 && item.spent > item.budgetLimit;
                return (
                  <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums text-neutral-500">
                      {item.count}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-neutral-900 dark:text-white">
                      {formatMoney(item.spent, currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-neutral-500">
                      {formatMoney(item.budgetLimit, currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                      <span className={item.variance < 0 ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'}>
                        {formatMoney(item.variance, currency, { showSign: true })}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                      {item.pctOfTotalSpend.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[11px] font-semibold ${isOver ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {item.budgetLimit === 0 ? 'Not Set' : isOver ? 'Exceeded' : 'Within Budget'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
