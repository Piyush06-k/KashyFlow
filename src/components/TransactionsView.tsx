import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Sparkles,
  X,
  FileSpreadsheet,
  FileCode,
  ArrowUpDown,
} from 'lucide-react';
import { BankAccount, Category, Transaction, TransactionType } from '../types/budget';
import { predictCategoryWithML } from '../services/mlService';
import { formatMoney, getCurrencySymbol, getCurrencyInfo } from '../services/currencyService';

interface TransactionsViewProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: BankAccount[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction: (id: string, tx: Partial<Transaction>) => void;
  onDeleteTransaction: (id: string) => void;
  onImportJSON: (jsonStr: string) => void;
  onExportJSON: () => void;
  currency?: string;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  categories,
  accounts,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onImportJSON,
  onExportJSON,
  currency = 'INR',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [formCategory, setFormCategory] = useState('Groceries & Food');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formAccount, setFormAccount] = useState(accounts[0]?.id || 'acc-primary');
  const [formNotes, setFormNotes] = useState('');
  const [formRecurring, setFormRecurring] = useState(false);
  const [isMLPredicting, setIsMLPredicting] = useState(false);

  // Filtered & sorted list
  const filtered = useMemo(() => {
    return transactions
      .filter((t) => {
        if (typeFilter !== 'all' && t.type !== typeFilter) return false;
        if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
        if (accountFilter !== 'all' && t.accountId !== accountFilter) return false;
        if (searchTerm.trim()) {
          const s = searchTerm.toLowerCase();
          const matchDesc = t.description.toLowerCase().includes(s);
          const matchNotes = t.notes ? t.notes.toLowerCase().includes(s) : false;
          const matchCat = t.category.toLowerCase().includes(s);
          if (!matchDesc && !matchNotes && !matchCat) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date') {
          const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
          return sortOrder === 'desc' ? diff : -diff;
        } else {
          const diff = Math.abs(b.amount) - Math.abs(a.amount);
          return sortOrder === 'desc' ? diff : -diff;
        }
      });
  }, [transactions, searchTerm, typeFilter, categoryFilter, accountFilter, sortBy, sortOrder]);

  const totalFilteredIncome = filtered
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalFilteredExpense = filtered
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // CSV Export handler
  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Description', 'Amount', 'Type', 'Category', 'Account', 'Notes', 'BankSynced'];
    const rows = filtered.map((t) => [
      t.id,
      t.date,
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount,
      t.type,
      `"${t.category}"`,
      t.bankName || 'Manual',
      `"${(t.notes || '').replace(/"/g, '""')}"`,
      t.isBankSynced ? 'YES' : 'NO',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `kashflow_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // JSON Import handler
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        onImportJSON(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Open modal for add or edit
  const openAddModal = () => {
    setEditingId(null);
    setFormDescription('');
    setFormAmount('');
    setFormType('expense');
    setFormCategory(categories[0]?.name || 'Groceries & Food');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormAccount(accounts[0]?.id || '');
    setFormNotes('');
    setFormRecurring(false);
    setIsModalOpen(true);
  };

  const openEditModal = (t: Transaction) => {
    setEditingId(t.id);
    setFormDescription(t.description);
    setFormAmount(Math.abs(t.amount).toString());
    setFormType(t.type);
    setFormCategory(t.category);
    setFormDate(t.date);
    setFormAccount(t.accountId);
    setFormNotes(t.notes || '');
    setFormRecurring(!!t.isRecurring);
    setIsModalOpen(true);
  };

  const handleSmartCategorize = async () => {
    if (!formDescription.trim()) return;
    setIsMLPredicting(true);
    try {
      const res = await predictCategoryWithML(formDescription, parseFloat(formAmount) || 0);
      if (res.predictedCategory) {
        setFormCategory(res.predictedCategory);
      }
    } finally {
      setIsMLPredicting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmt = parseFloat(formAmount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) return;

    const finalAmt = formType === 'expense' ? -parsedAmt : parsedAmt;

    if (editingId) {
      onUpdateTransaction(editingId, {
        description: formDescription.trim(),
        amount: finalAmt,
        type: formType,
        category: formCategory,
        date: formDate,
        accountId: formAccount,
        notes: formNotes.trim() || undefined,
        isRecurring: formRecurring,
      });
    } else {
      onAddTransaction({
        description: formDescription.trim(),
        amount: finalAmt,
        type: formType,
        category: formCategory,
        date: formDate,
        accountId: formAccount,
        notes: formNotes.trim() || undefined,
        isRecurring: formRecurring,
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
            Transactions Ledger
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {filtered.length} entries · Verified financial movements & records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Download CSV Spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Export CSV</span>
          </button>

          {/* JSON Export */}
          <button
            onClick={onExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Download complete JSON backup vault"
          >
            <FileCode className="w-3.5 h-3.5 text-blue-500" />
            <span>Export JSON</span>
          </button>

          {/* JSON Import */}
          <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-neutral-500" />
            <span>Import JSON</span>
            <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
          </label>

          {/* Add Transaction Button */}
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search descriptions, memos, merchants..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-neutral-900 dark:text-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-950 rounded-lg border border-neutral-200/60 dark:border-neutral-800/60">
            {(['all', 'expense', 'income', 'transfer'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize cursor-pointer ${
                  typeFilter === t
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs font-semibold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Second Filter Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 text-xs">
          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200 text-xs"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Account Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500">Account:</span>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200 text-xs"
            >
              <option value="all">All Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.institutionName} - {a.accountName} (*{a.mask})</option>
              ))}
            </select>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-neutral-500">Sort:</span>
            <button
              onClick={() => {
                if (sortBy === 'date') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                else { setSortBy('date'); setSortOrder('desc'); }
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded border ${sortBy === 'date' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold' : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'}`}
            >
              <span>Date {sortBy === 'date' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}</span>
            </button>
            <button
              onClick={() => {
                if (sortBy === 'amount') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                else { setSortBy('amount'); setSortOrder('desc'); }
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded border ${sortBy === 'amount' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold' : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'}`}
            >
              <span>Amount {sortBy === 'amount' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. High Density Ledger Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 text-neutral-500 font-medium">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Account / Source</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    No transactions match your search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => {
                  const isIncome = tx.type === 'income';
                  const isExpense = tx.type === 'expense';
                  const account = accounts.find((a) => a.id === tx.accountId);

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono tabular-nums text-neutral-500 whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-950 dark:text-white">
                          {tx.description}
                        </div>
                        {tx.notes && (
                          <div className="text-[11px] text-neutral-400 truncate max-w-sm">
                            {tx.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-neutral-700 dark:text-neutral-300">
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-500 whitespace-nowrap">
                        {tx.bankName ? (
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>{tx.bankName}</span>
                          </span>
                        ) : account ? (
                          <span>{account.institutionName} (*{account.mask})</span>
                        ) : (
                          <span>Manual</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold whitespace-nowrap">
                        <span
                          className={
                            isIncome
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isExpense
                              ? 'text-neutral-950 dark:text-neutral-100'
                              : 'text-blue-500'
                          }
                        >
                          {formatMoney(Math.abs(tx.amount), currency, { showSign: isIncome })}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(tx)}
                            title="Edit"
                            className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteTransaction(tx.id)}
                            title="Delete"
                            className="p-1 text-neutral-400 hover:text-rose-600 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Ledger Bottom Summary Bar */}
        <div className="bg-neutral-50/60 dark:bg-neutral-950/60 border-t border-neutral-200 dark:border-neutral-800 p-3 px-4 flex flex-wrap items-center justify-between text-xs text-neutral-500 gap-2">
          <div className="flex items-center gap-4">
            <span>Filtered: <strong className="text-neutral-900 dark:text-white font-mono">{filtered.length}</strong></span>
            <span>Total Inflow: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatMoney(totalFilteredIncome, currency, { showSign: true })}</strong></span>
            <span>Total Outflow: <strong className="text-neutral-900 dark:text-white font-mono">{formatMoney(totalFilteredExpense, currency)}</strong></span>
          </div>
          <div>
            Net Difference: <strong className="font-mono text-neutral-900 dark:text-white">{formatMoney(totalFilteredIncome - totalFilteredExpense, currency, { showSign: true })}</strong>
          </div>
        </div>
      </div>

      {/* 4. Add / Edit Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-6 animate-in zoom-in-95 duration-150 text-neutral-900 dark:text-white">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold">
                {editingId ? 'Edit Transaction' : 'Record New Transaction'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 pt-4 text-xs">
              {/* Type Switcher */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-100 dark:bg-neutral-950 rounded-lg">
                {(['expense', 'income', 'transfer'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormType(t)}
                    className={`py-1.5 font-medium rounded-md capitalize cursor-pointer transition-colors ${
                      formType === t
                        ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs font-semibold'
                        : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-neutral-500 font-medium mb-1">
                  Amount ({getCurrencySymbol(currency)} {currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-base font-mono rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Description & ML Categorizer */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-neutral-500 font-medium">Merchant / Description</label>
                  <button
                    type="button"
                    onClick={handleSmartCategorize}
                    disabled={isMLPredicting || !formDescription.trim()}
                    className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isMLPredicting ? 'Analyzing...' : 'Auto-Categorize with ML'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. Trader Joe's, Uber, Starbucks, ConEd..."
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Category & Date Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none"
                  >
                    {formType === 'income' ? (
                      <option value="Income">Income / Salary</option>
                    ) : (
                      categories.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none font-mono"
                  />
                </div>
              </div>

              {/* Account */}
              <div>
                <label className="block text-neutral-500 font-medium mb-1">Account Source</label>
                <select
                  value={formAccount}
                  onChange={(e) => setFormAccount(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none"
                >
                  {accounts.length === 0 ? (
                    <option value="acc-primary">Primary Wallet / Personal Ledger</option>
                  ) : (
                    accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.institutionName} - {a.accountName} (*{a.mask})</option>
                    ))
                  )}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-neutral-500 font-medium mb-1">Notes / Tags (Optional)</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Tax deductible business expense"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none"
                />
              </div>

              {/* Recurring Switch */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="recurringCheck"
                  checked={formRecurring}
                  onChange={(e) => setFormRecurring(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="recurringCheck" className="text-neutral-600 dark:text-neutral-400 cursor-pointer">
                  Mark as recurring regular expense
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold cursor-pointer shadow-sm"
                >
                  {editingId ? 'Save Changes' : 'Record Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
