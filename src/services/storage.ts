import { BudgetAppData, Category, Transaction, BankAccount, RecurringBill, SavingsGoal } from '../types/budget';

const STORAGE_KEY = 'kashflow_budget_vault_v1';
const PENDING_SYNC_KEY = 'kashflow_pending_mutations';
const CLEAN_VAULT_INIT_KEY = 'kashflow_clean_vault_inr_v7';

// Standard Default Categories (with $0 initial budget so user sets their own)
export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-housing', name: 'Housing & Rent', budgetLimit: 0, color: '#3B82F6', icon: 'Home', type: 'essential' },
  { id: 'cat-groceries', name: 'Groceries & Food', budgetLimit: 0, color: '#10B981', icon: 'ShoppingCart', type: 'essential' },
  { id: 'cat-dining', name: 'Dining & Drinks', budgetLimit: 0, color: '#F59E0B', icon: 'Utensils', type: 'discretionary' },
  { id: 'cat-transport', name: 'Transportation', budgetLimit: 0, color: '#8B5CF6', icon: 'Car', type: 'essential' },
  { id: 'cat-utilities', name: 'Utilities & Bills', budgetLimit: 0, color: '#06B6D4', icon: 'Zap', type: 'essential' },
  { id: 'cat-entertainment', name: 'Entertainment & Subs', budgetLimit: 0, color: '#EC4899', icon: 'Tv', type: 'discretionary' },
  { id: 'cat-health', name: 'Health & Wellness', budgetLimit: 0, color: '#14B8A6', icon: 'HeartPulse', type: 'essential' },
  { id: 'cat-shopping', name: 'Shopping & Gear', budgetLimit: 0, color: '#F97316', icon: 'ShoppingBag', type: 'discretionary' },
  { id: 'cat-savings', name: 'Savings & Investments', budgetLimit: 0, color: '#10B981', icon: 'TrendingUp', type: 'savings' },
];

// Clean empty defaults - User starts with a fresh blank canvas
export const INITIAL_ACCOUNTS: BankAccount[] = [];
export const INITIAL_BILLS: RecurringBill[] = [];
export const INITIAL_GOALS: SavingsGoal[] = [];
export const INITIAL_TRANSACTIONS: Transaction[] = [];

// Sample Demo Data (Available on-demand if user requests sample numbers)
export const SAMPLE_DEMO_CATEGORIES: Category[] = [
  { id: 'cat-housing', name: 'Housing & Rent', budgetLimit: 1650, color: '#3B82F6', icon: 'Home', type: 'essential' },
  { id: 'cat-groceries', name: 'Groceries & Food', budgetLimit: 550, color: '#10B981', icon: 'ShoppingCart', type: 'essential' },
  { id: 'cat-dining', name: 'Dining & Drinks', budgetLimit: 350, color: '#F59E0B', icon: 'Utensils', type: 'discretionary' },
  { id: 'cat-transport', name: 'Transportation', budgetLimit: 280, color: '#8B5CF6', icon: 'Car', type: 'essential' },
  { id: 'cat-utilities', name: 'Utilities & Bills', budgetLimit: 220, color: '#06B6D4', icon: 'Zap', type: 'essential' },
  { id: 'cat-entertainment', name: 'Entertainment & Subs', budgetLimit: 140, color: '#EC4899', icon: 'Tv', type: 'discretionary' },
  { id: 'cat-health', name: 'Health & Wellness', budgetLimit: 180, color: '#14B8A6', icon: 'HeartPulse', type: 'essential' },
  { id: 'cat-shopping', name: 'Shopping & Gear', budgetLimit: 250, color: '#F97316', icon: 'ShoppingBag', type: 'discretionary' },
  { id: 'cat-savings', name: 'Savings & Investments', budgetLimit: 800, color: '#10B981', icon: 'TrendingUp', type: 'savings' },
];

export const SAMPLE_DEMO_ACCOUNTS: BankAccount[] = [
  {
    id: 'acc-chase-chk',
    institutionId: 'chase',
    institutionName: 'JPMorgan Chase',
    accountName: 'Premier Checking',
    accountType: 'checking',
    mask: '4091',
    balance: 4820.50,
    lastSynced: new Date().toISOString(),
    status: 'connected',
    color: '#117ACA',
  },
  {
    id: 'acc-amex-gold',
    institutionId: 'amex',
    institutionName: 'American Express',
    accountName: 'Gold Card',
    accountType: 'credit',
    mask: '8821',
    balance: -842.15,
    lastSynced: new Date().toISOString(),
    status: 'connected',
    color: '#006FCF',
  },
  {
    id: 'acc-revolut-vault',
    institutionId: 'revolut',
    institutionName: 'Revolut',
    accountName: 'High-Yield Vault',
    accountType: 'savings',
    mask: '1240',
    balance: 14500.00,
    lastSynced: new Date().toISOString(),
    status: 'connected',
    color: '#0075EB',
  },
];

export const SAMPLE_DEMO_BILLS: RecurringBill[] = [
  {
    id: 'bill-rent',
    title: 'Apartment Monthly Lease',
    amount: 1650.00,
    dueDate: '2026-10-01',
    frequency: 'monthly',
    category: 'Housing & Rent',
    isAutopay: true,
    isPaid: false,
    reminderDaysBefore: 3,
  },
  {
    id: 'bill-electric',
    title: 'Electric & Power Grid',
    amount: 94.20,
    dueDate: '2026-10-05',
    frequency: 'monthly',
    category: 'Utilities & Bills',
    isAutopay: true,
    isPaid: false,
    reminderDaysBefore: 2,
  },
  {
    id: 'bill-internet',
    title: 'Fiber Gigabit Internet',
    amount: 70.00,
    dueDate: '2026-10-12',
    frequency: 'monthly',
    category: 'Utilities & Bills',
    isAutopay: true,
    isPaid: false,
    reminderDaysBefore: 2,
  },
];

export const SAMPLE_DEMO_GOALS: SavingsGoal[] = [
  {
    id: 'goal-emergency',
    name: 'Emergency Reserve',
    targetAmount: 10000,
    currentAmount: 3500,
    targetDate: '2026-12-31',
    category: 'Savings & Investments',
    color: '#10B981',
  },
];

export const SAMPLE_DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-demo-001',
    description: 'Tech Payroll Direct Deposit',
    amount: 3200.00,
    category: 'Income',
    date: new Date().toISOString().split('T')[0],
    type: 'income',
    accountId: 'acc-chase-chk',
    notes: 'Bi-weekly payroll',
    isBankSynced: true,
    bankName: 'JPMorgan Chase',
  },
  {
    id: 'tx-demo-002',
    description: 'Whole Foods Market',
    amount: -86.40,
    category: 'Groceries & Food',
    date: new Date().toISOString().split('T')[0],
    type: 'expense',
    accountId: 'acc-amex-gold',
    notes: 'Weekly pantry restocking',
    isBankSynced: true,
    bankName: 'American Express',
  },
];

export function getInitialBudgetData(): BudgetAppData {
  return {
    transactions: [],
    categories: INITIAL_CATEGORIES,
    accounts: [],
    bills: [],
    goals: [],
    monthlyBudgetTotal: 0,
    savingsTarget: 0,
    currency: 'INR',
    biometricEnabled: false,
    biometricPin: '1234',
    autoLockMinutes: 15,
    lastModified: new Date().toISOString(),
  };
}

export function loadLocalBudgetVault(): BudgetAppData {
  try {
    if (typeof window !== 'undefined') {
      // Force clean initialization for user to start fresh with an empty ledger
      const isCleanInit = localStorage.getItem(CLEAN_VAULT_INIT_KEY);
      if (!isCleanInit) {
        localStorage.setItem(CLEAN_VAULT_INIT_KEY, 'true');
        const emptyData = getInitialBudgetData();
        saveLocalBudgetVault(emptyData);
        return emptyData;
      }

      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.transactions)) {
          // Default currency to INR if USD or unset
          if (!parsed.currency || parsed.currency === 'USD') {
            parsed.currency = 'INR';
            saveLocalBudgetVault(parsed);
          }
          return parsed;
        }
      }
    }
  } catch (err) {
    console.error('Failed to parse local budget vault:', err);
  }
  const defaultData = getInitialBudgetData();
  saveLocalBudgetVault(defaultData);
  return defaultData;
}

export function saveLocalBudgetVault(data: BudgetAppData): void {
  if (typeof window === 'undefined') return;
  try {
    data.lastModified = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

export function resetVaultToEmpty(): BudgetAppData {
  const empty = getInitialBudgetData();
  saveLocalBudgetVault(empty);
  syncWithCloudStorage(empty);
  return empty;
}

export function loadDemoSampleData(): BudgetAppData {
  const sample: BudgetAppData = {
    transactions: SAMPLE_DEMO_TRANSACTIONS,
    categories: SAMPLE_DEMO_CATEGORIES,
    accounts: SAMPLE_DEMO_ACCOUNTS,
    bills: SAMPLE_DEMO_BILLS,
    goals: SAMPLE_DEMO_GOALS,
    monthlyBudgetTotal: 3420,
    savingsTarget: 800,
    currency: 'USD',
    biometricEnabled: false,
    biometricPin: '1234',
    autoLockMinutes: 15,
    lastModified: new Date().toISOString(),
  };
  saveLocalBudgetVault(sample);
  syncWithCloudStorage(sample);
  return sample;
}

// Cloud Synchronization Engine
export async function syncWithCloudStorage(localData: BudgetAppData): Promise<{
  success: boolean;
  syncedAt: string;
  source: 'cloud' | 'local';
  data: BudgetAppData;
}> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      localStorage.setItem(PENDING_SYNC_KEY, 'true');
      return {
        success: false,
        syncedAt: new Date().toISOString(),
        source: 'local',
        data: localData,
      };
    }

    const deviceId = localStorage.getItem('kashflow_device_id') || `device_${Math.random().toString(36).substring(2, 8)}`;
    localStorage.setItem('kashflow_device_id', deviceId);

    const pushRes = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId,
        data: localData,
        timestamp: new Date().toISOString(),
      }),
    });

    if (pushRes.ok) {
      const json = await pushRes.json();
      localStorage.removeItem(PENDING_SYNC_KEY);
      return {
        success: true,
        syncedAt: json.lastSyncedAt || new Date().toISOString(),
        source: 'cloud',
        data: localData,
      };
    }
  } catch (err) {
    console.warn('Cloud sync offline or error:', err);
  }

  return {
    success: false,
    syncedAt: new Date().toISOString(),
    source: 'local',
    data: localData,
  };
}

export async function pullFromCloudStorage(): Promise<BudgetAppData | null> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
    const res = await fetch('/api/sync');
    if (res.ok) {
      const json = await res.json();
      if (json && json.data && Array.isArray(json.data.transactions)) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Failed to pull from cloud:', err);
  }
  return null;
}
