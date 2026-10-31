import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Sparkles,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  BankAccount,
  Category,
  MLForecastResult,
  RecurringBill,
  SavingsGoal,
  Transaction,
} from '../types/budget';
import { createGoogleCalendarUrl } from '../services/calendarService';
import { formatMoney } from '../services/currencyService';

interface DashboardViewProps {
  accounts: BankAccount[];
  transactions: Transaction[];
  categories: Category[];
  bills: RecurringBill[];
  goals: SavingsGoal[];
  monthlyBudget: number;
  forecast: MLForecastResult | null;
  onNavigate: (tab: string) => void;
  onOpenNewTransaction: () => void;
  onToggleBillPaid: (billId: string) => void;
  currency?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  accounts,
  transactions,
  categories,
  bills,
  goals,
  monthlyBudget,
  forecast,
  onNavigate,
  onOpenNewTransaction,
  onToggleBillPaid,
  currency = 'INR',
}) => {
  // Compute total net worth
  const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);

  // Compute current month income and expenses
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const currentMonthTxns = transactions.filter((t) => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const totalIncome = currentMonthTxns
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const totalExpenses = currentMonthTxns
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // Category spending map for current month
  const categorySpentMap: Record<string, number> = {};
  currentMonthTxns.forEach((t) => {
    if (t.type === 'expense') {
      categorySpentMap[t.category] = (categorySpentMap[t.category] || 0) + Math.abs(t.amount);
    }
  });

  const upcomingBills = bills
    .filter((b) => !b.isPaid)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. Header & Quick Stat Grid */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
              Financial Overview
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Real-time cash flow, category budgets, and spending projections
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('ai')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>AI Advisor</span>
            </button>
            <button
              onClick={() => onNavigate('reports')}
              className="px-3.5 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Monthly Reports
            </button>
            <button
              onClick={onOpenNewTransaction}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              + Add Transaction
            </button>
          </div>
        </div>

        {/* 4 Core Financial Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Net Liquid Balance */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
              <span className="text-xs font-medium">Total Liquid Net Worth</span>
              <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white font-mono tabular-nums">
              {formatMoney(totalBalance, currency)}
            </div>
            <div className="mt-2 text-xs text-neutral-500 flex items-center gap-1.5">
              <span>{accounts.length === 0 ? 'No accounts added yet' : `Across ${accounts.length} synced accounts`}</span>
              <span aria-hidden="true">·</span>
              <button
                onClick={() => onNavigate('banks')}
                className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium cursor-pointer"
              >
                {accounts.length === 0 ? '+ Add Account' : 'Manage'}
              </button>
            </div>
          </div>

          {/* Monthly Inflow */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
              <span className="text-xs font-medium">Monthly Inflow (Income)</span>
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {formatMoney(totalIncome, currency, { showSign: true })}
            </div>
            <div className="mt-2 text-xs text-neutral-500">
              {currentMonthTxns.filter((t) => t.type === 'income').length} current cycle receipts
            </div>
          </div>

          {/* Monthly Outflow */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
              <span className="text-xs font-medium">Monthly Outflow (Spent)</span>
              <TrendingDown className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white font-mono tabular-nums">
              {formatMoney(totalExpenses, currency)}
            </div>
            <div className="mt-2 text-xs text-neutral-500 flex items-center gap-1">
              <span>Budget Cap:</span>
              <span className="font-mono tabular-nums font-medium text-neutral-700 dark:text-neutral-300">
                {formatMoney(monthlyBudget, currency)}
              </span>
            </div>
          </div>

          {/* Net Savings & Rate */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
              <span className="text-xs font-medium">Net Savings & Rate</span>
              <ShieldCheck className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white font-mono tabular-nums">
              {savingsRate.toFixed(1)}%
            </div>
            <div className="mt-2 text-xs text-neutral-500 flex items-center gap-1">
              <span>Saved so far:</span>
              <span className="font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                {formatMoney(Math.max(0, netSavings), currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Machine Learning Spending Forecast & Anomaly Banner */}
      <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 text-white rounded-2xl p-6 border border-neutral-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">
                  Spending Forecast & Projections
                </h3>
                <span className="text-[11px] text-emerald-400 font-mono">
                  Monthly Projection
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                {transactions.length === 0
                  ? 'Add your custom expenses or income to view projected spending trajectories.'
                  : 'Projected month-end trajectory based on your daily spending habits'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
              transactions.length === 0
                ? 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                : forecast?.burn_status === 'over_budget'
                ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                : forecast?.burn_status === 'near_limit'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
            }`}>
              {transactions.length === 0
                ? 'Awaiting Entries'
                : forecast?.burn_status === 'over_budget'
                ? 'High Burn Alert'
                : forecast?.burn_status === 'near_limit'
                ? 'Approaching Budget Cap'
                : 'Pacing Under Target'}
            </span>
          </div>
        </div>

        {/* Forecast Numbers Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
          <div>
            <div className="text-xs text-neutral-400">Current Spent</div>
            <div className="text-xl font-bold font-mono tabular-nums text-white mt-0.5">
              {formatMoney(forecast?.spent_so_far ?? totalExpenses, currency)}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">Verified ledger entries</div>
          </div>

          <div>
            <div className="text-xs text-neutral-400">Projected Month-End</div>
            <div className="text-xl font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
              {formatMoney(forecast?.projected_total ?? totalExpenses, currency)}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              Variance: {formatMoney(forecast?.projected_variance || 0, currency, { showSign: true })} vs budget
            </div>
          </div>

          <div>
            <div className="text-xs text-neutral-400">Daily Burn Pace</div>
            <div className="text-xl font-bold font-mono tabular-nums text-white mt-0.5">
              {formatMoney(forecast?.daily_burn_rate ?? 0, currency)}/day
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              {forecast?.days_remaining ?? 0} days remaining
            </div>
          </div>

          <div>
            <div className="text-xs text-neutral-400">Recommended Daily Cap</div>
            <div className="text-xl font-bold font-mono tabular-nums text-blue-400 mt-0.5">
              {formatMoney(forecast?.recommended_daily_cap ?? 0, currency)}/day
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              To finish month under limit
            </div>
          </div>
        </div>

        {/* AI Action Banner */}
        <div className="mt-5 pt-4 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-neutral-400">
            Want deeper recommendations on where to reduce expenses?
          </span>
          <button
            type="button"
            onClick={() => onNavigate('ai')}
            className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Consult AI Advisor & Run Health Audit →</span>
          </button>
        </div>
      </div>

      {/* 3. Two-Column Split: Category Budgets vs Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Category Budgets (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800 mb-4">
            <div>
              <h2 className="text-base font-semibold text-neutral-950 dark:text-white">
                Monthly Category Budgets
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Target allowances vs current month spend
              </p>
            </div>
            <button
              onClick={() => onNavigate('categories')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Categories</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {categories.slice(0, 6).map((cat) => {
              const spent = categorySpentMap[cat.name] || 0;
              const limit = cat.budgetLimit;
              const percent = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
              const isOver = limit > 0 && spent > limit;

              return (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-medium text-neutral-900 dark:text-neutral-100">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span>{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
                      <span className={isOver ? 'text-rose-600 font-semibold' : 'text-neutral-900 dark:text-neutral-200'}>
                        {formatMoney(spent, currency)}
                      </span>
                      <span>/</span>
                      <span>{formatMoney(limit, currency, { decimals: 0 })}</span>
                      <span className={`text-[11px] ${isOver ? 'text-rose-600 font-semibold' : 'text-neutral-500'}`}>
                        ({percent}%)
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isOver
                          ? 'bg-rose-500'
                          : percent >= 80
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center text-xs">
            <span className="text-neutral-500">
              Total Budgeted: <span className="font-mono font-medium text-neutral-900 dark:text-white">{formatMoney(monthlyBudget, currency)}</span>
            </span>
            <button
              onClick={() => onNavigate('reports')}
              className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
            >
              View Detailed Variance Report &rarr;
            </button>
          </div>
        </div>

        {/* Right Column: Upcoming Bills & Recurring Payables (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800 mb-4">
            <div>
              <h2 className="text-base font-semibold text-neutral-950 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-500" />
                Upcoming Bills
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Scheduled expenses & external calendar integration
              </p>
            </div>
            <button
              onClick={() => onNavigate('calendar')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Full Calendar
            </button>
          </div>

          <div className="space-y-3">
            {bills.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400 space-y-2">
                <p>No recurring bills scheduled yet.</p>
                <button
                  onClick={() => onNavigate('calendar')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer transition-colors"
                >
                  + Add First Bill
                </button>
              </div>
            ) : upcomingBills.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                All bills marked paid for this cycle.
              </div>
            ) : (
              upcomingBills.map((bill) => {
                const gCalUrl = createGoogleCalendarUrl(bill, currency);
                return (
                  <div
                    key={bill.id}
                    className="p-3 rounded-lg border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-800/30 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        {bill.title}
                      </div>
                      <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 font-mono">
                        <Clock className="w-3 h-3 text-neutral-400" />
                        <span>Due {bill.dueDate}</span>
                        {bill.isAutopay && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-600 dark:text-emerald-400">Autopay</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold font-mono text-neutral-950 dark:text-white tabular-nums">
                        {formatMoney(bill.amount, currency)}
                      </span>
                      
                      {/* Google Calendar Link */}
                      <a
                        href={gCalUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Add to Google Calendar"
                        className="p-1 text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      {/* Mark Paid button */}
                      <button
                        onClick={() => onToggleBillPaid(bill.id)}
                        title="Mark as paid"
                        className="p-1 text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Savings Goals Snapshot */}
          <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center justify-between">
              <span>Savings Targets</span>
              <span className="font-mono text-neutral-500">{goals.length} Goals Active</span>
            </div>
            <div className="space-y-3">
              {goals.length === 0 ? (
                <div className="py-4 text-center text-xs text-neutral-400">
                  No savings goals created yet.
                </div>
              ) : (
                goals.map((g) => {
                  const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
                  return (
                    <div key={g.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-neutral-700 dark:text-neutral-300 font-medium">{g.name}</span>
                        <span className="font-mono tabular-nums text-neutral-500">
                          {formatMoney(g.currentAmount, currency, { decimals: 0 })} / {formatMoney(g.targetAmount, currency, { decimals: 0 })} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Recent Transactions Ledger Snapshot */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800 mb-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-950 dark:text-white">
              Recent Ledger Activity
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Synchronized entries with merchant categorization
            </p>
          </div>
          <button
            onClick={() => onNavigate('transactions')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All ({transactions.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-medium">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                        <ArrowDownLeft className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        No transactions recorded yet
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        Your budget ledger is clean and empty. Record your first transaction to start tracking your cash flow.
                      </p>
                      <button
                        type="button"
                        onClick={onOpenNewTransaction}
                        className="mt-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                      >
                        <span>+ Record First Transaction</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.slice(0, 5).map((tx) => {
                  const isExpense = tx.type === 'expense';
                  const isIncome = tx.type === 'income';

                  return (
                    <tr key={tx.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono text-neutral-500 tabular-nums">
                        {tx.date}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {tx.description}
                        </div>
                        {tx.notes && (
                          <div className="text-[11px] text-neutral-400 truncate max-w-xs">
                            {tx.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-neutral-600 dark:text-neutral-300">
                        {tx.category}
                      </td>
                      <td className="py-3 px-3 text-neutral-500">
                        {tx.bankName ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>{tx.bankName}</span>
                          </span>
                        ) : (
                          <span>Manual Entry</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold">
                        <span className={isIncome ? 'text-emerald-600 dark:text-emerald-400' : isExpense ? 'text-neutral-900 dark:text-neutral-100' : 'text-blue-500'}>
                          {formatMoney(Math.abs(tx.amount), currency, { showSign: isIncome })}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
