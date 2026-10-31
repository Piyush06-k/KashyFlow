/**
 * KashFlow Personal Budget Manager
 * Full-stack financial management application with Python ML forecasting,
 * bank synchronization, biometric security, custom categories, and offline sync.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  BudgetAppData,
  Category,
  NotificationItem,
  RecurringBill,
  Transaction,
  BankAccount,
  MLForecastResult,
  MLAnomaly,
  AuthUser,
} from './types/budget';
import {
  loadLocalBudgetVault,
  saveLocalBudgetVault,
  syncWithCloudStorage,
  pullFromCloudStorage,
} from './services/storage';
import { getCurrentUser, clearUserSession, updateUserProfile } from './services/authService';
import { fetchSpendingForecast, detectSpendingAnomalies } from './services/mlService';
import { triggerSystemNotification, createInAppNotification } from './services/notificationService';
import { formatMoney } from './services/currencyService';

// Components
import { LoginPage } from './components/LoginPage';
import { TopBar } from './components/TopBar';
import { BiometricLockModal } from './components/BiometricLockModal';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { BudgetsReportsView } from './components/BudgetsReportsView';
import { BankSyncView } from './components/BankSyncView';
import { BillsCalendarView } from './components/BillsCalendarView';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { PrintableReportModal } from './components/PrintableReportModal';
import { ProfileView } from './components/ProfileView';
import { AIAdvisorView } from './components/AIAdvisorView';

export default function App() {
  const [data, setData] = useState<BudgetAppData>(() => loadLocalBudgetVault());
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kashflow_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Authentication & Session State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getCurrentUser());

  // Security & Biometric Lock State
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Connectivity & Cloud Sync
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedText, setLastSyncedText] = useState<string>('Just now');

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif_welcome',
      title: 'KashFlow Initialized',
      message: 'Your personal budget vault is ready. All data is securely stored and synchronized.',
      timestamp: new Date().toISOString(),
      type: 'sync',
      read: false,
    },
    {
      id: 'notif_bill_upcoming',
      title: 'Upcoming Lease Payment',
      message: 'Apartment Monthly Lease scheduled for the 1st of the month.',
      timestamp: new Date().toISOString(),
      type: 'bill',
      read: false,
    },
  ]);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState<boolean>(false);

  // ML Analysis State
  const [forecast, setForecast] = useState<MLForecastResult | null>(null);
  const [anomalies, setAnomalies] = useState<MLAnomaly[]>([]);

  // Modals
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printYear, setPrintYear] = useState(new Date().getFullYear());
  const [printMonth, setPrintMonth] = useState(new Date().getMonth());

  // Dark Mode Sync to <html> and <body>
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (isDark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      if (body) {
        body.classList.add('dark');
        body.setAttribute('data-theme', 'dark');
      }
      localStorage.setItem('kashflow_theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      if (body) {
        body.classList.remove('dark');
        body.setAttribute('data-theme', 'light');
      }
      localStorage.setItem('kashflow_theme', 'light');
    }
  }, [isDark]);

  // Online / Offline Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSystemNotification('Back Online', 'Reconnected to cloud storage. Synchronizing pending mutations.');
      performSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      triggerSystemNotification('Offline Mode Active', 'Operating without internet. All updates cached locally.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [data]);

  // Sync with cloud on initial mount
  useEffect(() => {
    pullFromCloudStorage().then((remoteData) => {
      if (remoteData) {
        setData(remoteData);
        saveLocalBudgetVault(remoteData);
      }
    });
  }, []);

  // Recalculate Python ML Forecast and Anomalies when transactions or budget change
  const refreshMLMetrics = useCallback(async (currentData: BudgetAppData) => {
    const today = new Date();
    try {
      const fc = await fetchSpendingForecast(
        currentData.transactions,
        currentData.monthlyBudgetTotal,
        today.getFullYear(),
        today.getMonth()
      );
      setForecast(fc);

      const anoms = await detectSpendingAnomalies(currentData.transactions);
      setAnomalies(anoms);
    } catch (err) {
      console.warn('Error fetching ML metrics:', err);
    }
  }, []);

  useEffect(() => {
    refreshMLMetrics(data);
  }, [data.transactions, data.monthlyBudgetTotal, refreshMLMetrics]);

  // Save changes locally and debounce cloud push
  const updateDataState = (updater: (prev: BudgetAppData) => BudgetAppData) => {
    setData((prev) => {
      const next = updater(prev);
      saveLocalBudgetVault(next);
      // Background sync
      syncWithCloudStorage(next).then((res) => {
        if (res.success) {
          setLastSyncedText(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      });
      return next;
    });
  };

  const performSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncWithCloudStorage(data);
      if (res.success) {
        setLastSyncedText(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setNotifications((prev) => [
          createInAppNotification('Cloud Vault Synchronized', 'All accounts and transactions aligned across devices.', 'sync'),
          ...prev,
        ]);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // -------------------------------------------------------------
  // Data Handlers
  // -------------------------------------------------------------
  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const tx: Transaction = {
      ...newTx,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };

    updateDataState((prev) => {
      // Also adjust account balance
      let accountFound = false;
      let updatedAccounts = prev.accounts.map((acc) => {
        if (acc.id === tx.accountId) {
          accountFound = true;
          return { ...acc, balance: acc.balance + tx.amount };
        }
        return acc;
      });

      if (!accountFound) {
        const fallbackAcc: BankAccount = {
          id: tx.accountId || 'acc-primary',
          institutionId: 'wallet',
          institutionName: 'Primary Wallet',
          accountName: 'Personal Ledger',
          accountType: 'checking',
          mask: 'CASH',
          balance: tx.amount,
          lastSynced: new Date().toISOString(),
          status: 'connected',
          color: '#10B981',
        };
        updatedAccounts = [...updatedAccounts, fallbackAcc];
      }

      return {
        ...prev,
        transactions: [tx, ...prev.transactions],
        accounts: updatedAccounts,
      };
    });

    // Check if category budget is near or over limit
    const cat = data.categories.find((c) => c.name === tx.category);
    if (cat && tx.type === 'expense') {
      const now = new Date();
      const currentMonthSpent = [tx, ...data.transactions]
        .filter((t) => {
          const d = new Date(t.date + 'T00:00:00');
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && t.category === cat.name;
        })
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      if (currentMonthSpent >= cat.budgetLimit) {
        const title = `Budget Alert: ${cat.name} Exceeded`;
        const msg = `You have spent ${formatMoney(currentMonthSpent, data.currency || 'INR')} of your ${formatMoney(cat.budgetLimit, data.currency || 'INR')} monthly limit.`;
        triggerSystemNotification(title, msg);
        setNotifications((prev) => [createInAppNotification(title, msg, 'alert'), ...prev]);
      } else if (currentMonthSpent >= cat.budgetLimit * 0.85) {
        const title = `Budget Warning: ${cat.name} at 85%`;
        const msg = `${formatMoney(cat.budgetLimit - currentMonthSpent, data.currency || 'INR')} remaining before exceeding limit.`;
        triggerSystemNotification(title, msg);
        setNotifications((prev) => [createInAppNotification(title, msg, 'alert'), ...prev]);
      }
    }
  };

  const handleUpdateTransaction = (id: string, updates: Partial<Transaction>) => {
    updateDataState((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  };

  const handleDeleteTransaction = (id: string) => {
    updateDataState((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== id),
    }));
  };

  const handleAddAccount = (acc: BankAccount) => {
    updateDataState((prev) => ({
      ...prev,
      accounts: [...prev.accounts, acc],
    }));
    setNotifications((prev) => [
      createInAppNotification(`Bank Account Linked: ${acc.institutionName}`, `${acc.accountName} (*${acc.mask}) is now synchronized.`, 'sync'),
      ...prev,
    ]);
  };

  const handleRemoveAccount = (accId: string) => {
    updateDataState((prev) => ({
      ...prev,
      accounts: prev.accounts.filter((a) => a.id !== accId),
    }));
  };

  const handleTransactionsImported = (imported: Transaction[]) => {
    updateDataState((prev) => {
      // Filter out duplicates by description & date & amount
      const existingKeys = new Set(prev.transactions.map((t) => `${t.date}_${t.description}_${t.amount}`));
      const newItems = imported.filter((t) => !existingKeys.has(`${t.date}_${t.description}_${t.amount}`));
      return {
        ...prev,
        transactions: [...newItems, ...prev.transactions],
      };
    });
    setNotifications((prev) => [
      createInAppNotification('Live Bank Sync Completed', `${imported.length} new transactions fetched & categorized by ML.`, 'sync'),
      ...prev,
    ]);
  };

  const handleAddCategory = (newCat: Omit<Category, 'id'>) => {
    const cat: Category = {
      ...newCat,
      id: `cat_${Date.now()}`,
    };
    updateDataState((prev) => ({
      ...prev,
      categories: [...prev.categories, cat],
      monthlyBudgetTotal: prev.monthlyBudgetTotal + cat.budgetLimit,
    }));
  };

  const handleUpdateCategory = (id: string, updates: Partial<Category>) => {
    updateDataState((prev) => {
      const updated = prev.categories.map((c) => (c.id === id ? { ...c, ...updates } : c));
      const newTotal = updated.reduce((sum, c) => sum + c.budgetLimit, 0);
      return {
        ...prev,
        categories: updated,
        monthlyBudgetTotal: newTotal,
      };
    });
  };

  const handleDeleteCategory = (id: string) => {
    updateDataState((prev) => {
      const updated = prev.categories.filter((c) => c.id !== id);
      const newTotal = updated.reduce((sum, c) => sum + c.budgetLimit, 0);
      return {
        ...prev,
        categories: updated,
        monthlyBudgetTotal: newTotal,
      };
    });
  };

  const handleAddBill = (newBill: Omit<RecurringBill, 'id'>) => {
    const bill: RecurringBill = {
      ...newBill,
      id: `bill_${Date.now()}`,
    };
    updateDataState((prev) => ({
      ...prev,
      bills: [...prev.bills, bill],
    }));
  };

  const handleToggleBillPaid = (billId: string) => {
    updateDataState((prev) => ({
      ...prev,
      bills: prev.bills.map((b) => (b.id === billId ? { ...b, isPaid: !b.isPaid } : b)),
    }));
  };

  const handleDeleteBill = (billId: string) => {
    updateDataState((prev) => ({
      ...prev,
      bills: prev.bills.filter((b) => b.id !== billId),
    }));
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kashflow_vault_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && Array.isArray(parsed.transactions)) {
        setData(parsed);
        saveLocalBudgetVault(parsed);
        performSync();
        setNotifications((prev) => [
          createInAppNotification('Backup Vault Restored', 'Successfully imported financial database from JSON file.', 'sync'),
          ...prev,
        ]);
      }
    } catch (e) {
      alert('Invalid JSON file format. Please upload a valid KashFlow backup.');
    }
  };

  const unreadNotifs = notifications.filter((n) => !n.read).length;

  // Gate app behind Login Page
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setNotifications((prev) => [
            createInAppNotification(
              'Vault Access Granted',
              `Welcome back, ${user.name}. Cloud sync and machine learning models are active.`,
              'sync'
            ),
            ...prev,
          ]);
        }}
        isDark={isDark}
        onToggleDark={() => setIsDark((prev) => !prev)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans transition-colors">
      
      {/* 1. Biometric & Vault Lock Screen */}
      <BiometricLockModal
        isLocked={isLocked}
        onUnlock={() => setIsLocked(false)}
        correctPin={data.biometricPin || '1234'}
      />

      {/* 2. Top Navigation Bar (Adhering to strict 3-zone contract) */}
      <TopBar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isDark={isDark}
        onToggleDark={() => setIsDark((prev) => !prev)}
        isOnline={isOnline}
        isSyncing={isSyncing}
        lastSyncedText={lastSyncedText}
        onManualSync={performSync}
        onLockVault={() => setIsLocked(true)}
        onOpenNewTransaction={() => setCurrentTab('transactions')}
        unreadNotificationCount={unreadNotifs}
        onOpenNotifications={() => setIsNotifDrawerOpen(true)}
        currentUser={currentUser}
        onLogout={() => {
          clearUserSession();
          setCurrentUser(null);
        }}
        currentCurrency={data.currency || 'INR'}
        onSelectCurrency={(code) => {
          updateDataState((prev) => ({ ...prev, currency: code }));
          if (currentUser) {
            updateUserProfile({ currency: code }).then((updated) => {
              if (updated) setCurrentUser(updated);
            });
          }
        }}
      />

      {/* 3. Offline Notice Banner */}
      {!isOnline && (
        <div className="bg-amber-500/10 dark:bg-amber-950/40 border-b border-amber-500/30 px-4 py-2 text-center text-xs text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>
            <strong>Offline Mode Active:</strong> You are currently disconnected from the network. All transactions and budget modifications are being preserved in local encrypted storage and will automatically synchronize with cloud storage when your internet resumes.
          </span>
        </div>
      )}

      {/* 4. Main Viewport Canvas (1440px max width baseline) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'dashboard' && (
          <DashboardView
            accounts={data.accounts}
            transactions={data.transactions}
            categories={data.categories}
            bills={data.bills}
            goals={data.goals}
            monthlyBudget={data.monthlyBudgetTotal}
            forecast={forecast}
            onNavigate={setCurrentTab}
            onOpenNewTransaction={() => setCurrentTab('transactions')}
            onToggleBillPaid={handleToggleBillPaid}
            currency={data.currency || 'INR'}
          />
        )}

        {currentTab === 'transactions' && (
          <TransactionsView
            transactions={data.transactions}
            categories={data.categories}
            accounts={data.accounts}
            onAddTransaction={handleAddTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onImportJSON={handleImportJSON}
            onExportJSON={handleExportJSON}
            currency={data.currency || 'INR'}
          />
        )}

        {currentTab === 'reports' && (
          <BudgetsReportsView
            transactions={data.transactions}
            categories={data.categories}
            monthlyBudget={data.monthlyBudgetTotal}
            forecast={forecast}
            anomalies={anomalies}
            currency={data.currency || 'INR'}
            onOpenPrintReport={(y, m) => {
              setPrintYear(y);
              setPrintMonth(m);
              setIsPrintModalOpen(true);
            }}
          />
        )}

        {currentTab === 'ai' && (
          <AIAdvisorView
            appData={data}
            currency={data.currency || 'INR'}
            onAddTransaction={handleAddTransaction}
            onUpdateCategory={handleUpdateCategory}
            onNavigate={setCurrentTab}
            onNotify={(title, msg, type) => {
              setNotifications((prev) => [createInAppNotification(title, msg, type), ...prev]);
            }}
          />
        )}

        {currentTab === 'banks' && (
          <BankSyncView
            accounts={data.accounts}
            onAddAccount={handleAddAccount}
            onRemoveAccount={handleRemoveAccount}
            onTransactionsImported={handleTransactionsImported}
            currency={data.currency || 'INR'}
            onUpdateAccountBalance={(accId, delta) => {
              updateDataState((prev) => ({
                ...prev,
                accounts: prev.accounts.map((a) => (a.id === accId ? { ...a, balance: a.balance + delta } : a)),
              }));
            }}
          />
        )}

        {currentTab === 'calendar' && (
          <BillsCalendarView
            bills={data.bills}
            categories={data.categories}
            onAddBill={handleAddBill}
            onTogglePaid={handleToggleBillPaid}
            onDeleteBill={handleDeleteBill}
            currency={data.currency || 'INR'}
            onSendReminder={(title, msg) => {
              setNotifications((prev) => [createInAppNotification(title, msg, 'bill'), ...prev]);
            }}
          />
        )}

        {currentTab === 'categories' && (
          <CategoryManagerModal
            categories={data.categories}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            currency={data.currency || 'INR'}
          />
        )}

        {currentTab === 'profile' && (
          <ProfileView
            currentUser={currentUser}
            onUpdateUser={(updated) => setCurrentUser(updated)}
            appData={data}
            onUpdateAppData={updateDataState}
            isDark={isDark}
            onToggleDark={() => setIsDark((prev) => !prev)}
            onSetDark={(val: boolean) => setIsDark(val)}
            onLogout={() => {
              clearUserSession();
              setCurrentUser(null);
            }}
            onNotify={(title, msg, type) => {
              setNotifications((prev) => [createInAppNotification(title, msg, type), ...prev]);
            }}
          />
        )}
      </main>

      {/* 5. Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        notifications={notifications}
        onMarkAllRead={() => {
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        }}
        onClearNotifications={() => setNotifications([])}
        onTriggerTestPush={() => {
          triggerSystemNotification(
            'Test Urgent Push Reminder',
            'Dining & Drinks reached 88% of your monthly envelope allocation.'
          );
          setNotifications((prev) => [
            createInAppNotification(
              'Test Urgent Push Reminder',
              'Dining & Drinks reached 88% of your monthly envelope allocation.',
              'alert'
            ),
            ...prev,
          ]);
        }}
      />

      {/* 6. Formatted Monthly Report Print Preview Modal */}
      <PrintableReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        year={printYear}
        month={printMonth}
        transactions={data.transactions}
        categories={data.categories}
        monthlyBudget={data.monthlyBudgetTotal}
        currency={data.currency || 'INR'}
      />

      {/* 7. Quiet Minimalist Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800/80 py-6 text-xs text-neutral-400 dark:text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">KashFlow</span>
            <span>·</span>
            <span>Personal Budget & Expense Manager</span>
          </div>
          <div className="text-[11px] text-neutral-400 dark:text-neutral-500">
            <span>Secure local storage · Offline capable</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
