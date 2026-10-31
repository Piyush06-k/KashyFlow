import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Download,
  ExternalLink,
  Plus,
  CheckCircle2,
  Clock,
  Bell,
  Trash2,
  X,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import { Category, RecurringBill } from '../types/budget';
import { createGoogleCalendarUrl, downloadBillsCalendarICS } from '../services/calendarService';
import { triggerSystemNotification } from '../services/notificationService';
import { formatMoney, getCurrencySymbol } from '../services/currencyService';

interface BillsCalendarViewProps {
  bills: RecurringBill[];
  categories: Category[];
  onAddBill: (bill: Omit<RecurringBill, 'id'>) => void;
  onTogglePaid: (billId: string) => void;
  onDeleteBill: (billId: string) => void;
  onSendReminder: (title: string, message: string) => void;
  currency?: string;
}

export const BillsCalendarView: React.FC<BillsCalendarViewProps> = ({
  bills,
  categories,
  onAddBill,
  onTogglePaid,
  onDeleteBill,
  onSendReminder,
  currency = 'INR',
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formFrequency, setFormFrequency] = useState<RecurringBill['frequency']>('monthly');
  const [formCategory, setFormCategory] = useState(categories[0]?.name || 'Housing & Rent');
  const [formAutopay, setFormAutopay] = useState(true);
  const [formReminderDays, setFormReminderDays] = useState(2);
  const [icsStatus, setIcsStatus] = useState('');

  const sortedBills = [...bills].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  const totalUnpaid = sortedBills
    .filter((b) => !b.isPaid)
    .reduce((sum, b) => sum + b.amount, 0);

  const handleExportICS = async () => {
    setIcsStatus('Exporting calendar schedule...');
    await downloadBillsCalendarICS(sortedBills, currency);
    setIcsStatus('Downloaded kashflow_budget_schedule.ics! Open to sync with Google / Apple / Outlook.');
    setTimeout(() => setIcsStatus(''), 4500);
  };

  const handleTestReminder = (bill: RecurringBill) => {
    const title = `Urgent Reminder: ${bill.title}`;
    const msg = `${formatMoney(bill.amount, currency)} due on ${bill.dueDate}. Autopay is ${bill.isAutopay ? 'Active' : 'Manual'}.`;
    triggerSystemNotification(title, msg);
    onSendReminder(title, msg);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0 || !formTitle.trim() || !formDueDate) return;

    onAddBill({
      title: formTitle.trim(),
      amount: amt,
      dueDate: formDueDate,
      frequency: formFrequency,
      category: formCategory,
      isAutopay: formAutopay,
      isPaid: false,
      reminderDaysBefore: formReminderDays,
    });

    setIsAddModalOpen(false);
    setFormTitle('');
    setFormAmount('');
    setFormDueDate('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
            Bills & Schedule Calendar
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            External calendar sync (.ICS, Google Calendar) & real-time push reminders
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export to ICS button */}
          <button
            onClick={handleExportICS}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Download .ICS for Google Calendar, Apple Calendar, or Outlook"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Export to Calendar (.ICS)</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Recurring Bill</span>
          </button>
        </div>
      </div>

      {/* ICS download feedback */}
      {icsStatus && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-lg flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{icsStatus}</span>
        </div>
      )}

      {/* 2. Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
          <div className="text-xs text-neutral-500 font-medium">Pending Unpaid Bills</div>
          <div className="text-2xl font-bold font-mono text-neutral-950 dark:text-white mt-1 tabular-nums">
            {formatMoney(totalUnpaid, currency)}
          </div>
          <div className="text-[11px] text-neutral-400 mt-2">
            {sortedBills.filter((b) => !b.isPaid).length} payables due this period
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
          <div className="text-xs text-neutral-500 font-medium">Automated Autopay Enabled</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {sortedBills.filter((b) => b.isAutopay).length} / {sortedBills.length}
          </div>
          <div className="text-[11px] text-neutral-400 mt-2">
            Linked to bank direct debit
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
          <div className="text-xs text-neutral-500 font-medium">External Calendar Integration</div>
          <div className="text-2xl font-bold font-mono text-blue-500 mt-1 tabular-nums">
            Ready
          </div>
          <div className="text-[11px] text-neutral-400 mt-2">
            RFC 5545 iCalendar standard
          </div>
        </div>
      </div>

      {/* 3. Bills Schedule List */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-5 pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="text-base font-semibold text-neutral-950 dark:text-white">
            Upcoming Payment Schedule & Reminders
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Click 'Add to Google Calendar' to create calendar appointments with pre-set alarms
          </p>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {sortedBills.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-400">
              No bills recorded yet. Add your rent, utilities, and memberships above.
            </div>
          ) : (
            sortedBills.map((bill) => {
              const gCalUrl = createGoogleCalendarUrl(bill, currency);
              return (
                <div
                  key={bill.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => onTogglePaid(bill.id)}
                      className={`mt-0.5 p-1 rounded-full cursor-pointer transition-colors ${
                        bill.isPaid
                          ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60'
                          : 'text-neutral-300 dark:text-neutral-700 hover:text-emerald-500'
                      }`}
                      title={bill.isPaid ? 'Mark as unpaid' : 'Mark as paid'}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-xs text-neutral-950 dark:text-white ${bill.isPaid ? 'line-through text-neutral-400 dark:text-neutral-500' : ''}`}>
                          {bill.title}
                        </span>
                        {bill.isAutopay && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-medium">
                            Autopay
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500 flex items-center gap-2 mt-0.5 font-mono">
                        <Clock className="w-3 h-3 text-neutral-400" />
                        <span>Due {bill.dueDate}</span>
                        <span>·</span>
                        <span>{bill.category}</span>
                        <span>·</span>
                        <span className="capitalize">{bill.frequency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pl-8 sm:pl-0">
                    <span className="text-sm font-bold font-mono tabular-nums text-neutral-950 dark:text-white">
                      {formatMoney(bill.amount, currency)}
                    </span>

                    {/* Google Calendar Link Button */}
                    <a
                      href={gCalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 hover:text-emerald-600 border border-neutral-200 dark:border-neutral-800 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                      title="Sync with Google Calendar"
                    >
                      <CalendarIcon className="w-3 h-3 text-emerald-500" />
                      <span>Google Cal</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>

                    {/* Test Push Reminder */}
                    <button
                      onClick={() => handleTestReminder(bill)}
                      className="p-1.5 text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                      title="Fire Test Push Notification"
                    >
                      <Bell className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => onDeleteBill(bill.id)}
                      className="p-1.5 text-neutral-400 hover:text-rose-600 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                      title="Delete Bill"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Add Bill Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-6 animate-in zoom-in-95 duration-150 text-neutral-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold">Add Recurring Bill</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="pt-4 space-y-4 text-xs">
              <div>
                <label className="block text-neutral-500 font-medium mb-1">Bill Name / Service</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Fiber Internet, Car Insurance, Lease"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 font-mono text-neutral-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 font-mono text-neutral-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Frequency</label>
                  <select
                    value={formFrequency}
                    onChange={(e) => setFormFrequency(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autopayCheck"
                  checked={formAutopay}
                  onChange={(e) => setFormAutopay(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="autopayCheck" className="text-neutral-700 dark:text-neutral-300 cursor-pointer">
                  Autopay is enabled via direct bank debit
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold cursor-pointer shadow-sm"
                >
                  Save Bill & Add Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
