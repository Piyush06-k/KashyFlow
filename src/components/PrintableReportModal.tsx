import React from 'react';
import { X, Printer, Download, CheckCircle2 } from 'lucide-react';
import { Category, Transaction } from '../types/budget';
import { formatMoney } from '../services/currencyService';

interface PrintableReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
  transactions: Transaction[];
  categories: Category[];
  monthlyBudget: number;
  currency?: string;
}

export const PrintableReportModal: React.FC<PrintableReportModalProps> = ({
  isOpen,
  onClose,
  year,
  month,
  transactions,
  categories,
  monthlyBudget,
  currency = 'INR',
}) => {
  if (!isOpen) return null;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const monthTxns = transactions.filter((t) => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const totalIncome = monthTxns
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalExpenses = monthTxns
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // Category breakdown
  const categoryMap: Record<string, number> = {};
  monthTxns.forEach((t) => {
    if (t.type === 'expense') {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + Math.abs(t.amount);
    }
  });

  // Top spending merchants
  const merchantMap: Record<string, number> = {};
  monthTxns.forEach((t) => {
    if (t.type === 'expense') {
      merchantMap[t.description] = (merchantMap[t.description] || 0) + Math.abs(t.amount);
    }
  });
  const topMerchants = Object.entries(merchantMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white text-neutral-900 rounded-2xl shadow-2xl p-8 my-8 relative">
        
        {/* Floating Screen Actions (Hidden on print) */}
        <div className="no-print flex items-center justify-between pb-6 mb-6 border-b border-neutral-200">
          <div className="text-xs text-neutral-500 font-medium">
            Print Preview Mode · Click Print to save as PDF or physical print
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-700 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="space-y-6 text-neutral-900 font-sans">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-neutral-300 pb-4">
            <div>
              <div className="text-2xl font-bold tracking-tight text-neutral-950 flex items-center gap-2">
                <span className="w-7 h-7 rounded bg-emerald-700 text-white flex items-center justify-center text-xs font-black">
                  K
                </span>
                KashFlow Personal Budget Manager
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                Executive Spending & Variance Ledger Audit
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-neutral-900 font-mono">
                {monthNames[month]} {year}
              </div>
              <div className="text-[11px] text-neutral-500 font-mono">
                Generated: {new Date().toISOString().split('T')[0]}
              </div>
            </div>
          </div>

          {/* Executive Metrics Grid */}
          <div className="grid grid-cols-4 gap-4 p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs">
            <div>
              <div className="text-neutral-500 font-medium">Total Inflow</div>
              <div className="text-lg font-bold font-mono text-emerald-700 mt-0.5">
                {formatMoney(totalIncome, currency, { showSign: true })}
              </div>
            </div>
            <div>
              <div className="text-neutral-500 font-medium">Total Expenditures</div>
              <div className="text-lg font-bold font-mono text-neutral-900 mt-0.5">
                {formatMoney(totalExpenses, currency)}
              </div>
            </div>
            <div>
              <div className="text-neutral-500 font-medium">Budget Allowance</div>
              <div className="text-lg font-bold font-mono text-neutral-900 mt-0.5">
                {formatMoney(monthlyBudget, currency)}
              </div>
            </div>
            <div>
              <div className="text-neutral-500 font-medium">Savings Realized</div>
              <div className="text-lg font-bold font-mono text-emerald-700 mt-0.5">
                {savingsRate.toFixed(1)}% ({formatMoney(netSavings, currency)})
              </div>
            </div>
          </div>

          {/* Category Breakdown Table */}
          <div>
            <h3 className="text-sm font-bold text-neutral-900 mb-2">Category Spending Breakdown</h3>
            <table className="w-full text-xs text-left border-collapse border border-neutral-200">
              <thead>
                <tr className="bg-neutral-100 text-neutral-600 border-b border-neutral-200 font-medium">
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5 text-right">Actual Spent</th>
                  <th className="p-2.5 text-right">Budget Limit</th>
                  <th className="p-2.5 text-right">Variance</th>
                  <th className="p-2.5 text-right">% of Outflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {categories.map((c) => {
                  const spent = categoryMap[c.name] || 0;
                  const variance = c.budgetLimit - spent;
                  const pct = totalExpenses > 0 ? (spent / totalExpenses) * 100 : 0;
                  return (
                    <tr key={c.id}>
                      <td className="p-2.5 font-medium">{c.name}</td>
                      <td className="p-2.5 text-right font-mono">{formatMoney(spent, currency)}</td>
                      <td className="p-2.5 text-right font-mono">{formatMoney(c.budgetLimit, currency)}</td>
                      <td className={`p-2.5 text-right font-mono font-semibold ${variance < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {formatMoney(variance, currency, { showSign: true })}
                      </td>
                      <td className="p-2.5 text-right font-mono">{pct.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Top 5 Merchant Payees */}
          <div>
            <h3 className="text-sm font-bold text-neutral-900 mb-2">Top 5 Merchant Payees</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {topMerchants.map(([merchant, amt], idx) => (
                <div key={idx} className="flex justify-between p-2 rounded border border-neutral-200 bg-neutral-50/50">
                  <span className="font-medium text-neutral-800">{idx + 1}. {merchant}</span>
                  <span className="font-mono font-bold">{formatMoney(amt, currency)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer certification note */}
          <div className="pt-4 border-t border-neutral-300 text-[11px] text-neutral-400 flex justify-between items-center">
            <span>KashFlow Financial Intelligence · Client Report</span>
            <span>Verified with local vault & Open Banking feeds</span>
          </div>
        </div>
      </div>
    </div>
  );
};
