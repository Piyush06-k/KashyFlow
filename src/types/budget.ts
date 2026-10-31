export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Transaction {
  id: string;
  description: string;
  amount: number; // negative for expense, positive for income
  category: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  accountId: string;
  notes?: string;
  isBankSynced?: boolean;
  bankName?: string;
  pending?: boolean;
  isRecurring?: boolean;
}

export type CategoryType = 'essential' | 'discretionary' | 'savings' | 'debt';

export interface Category {
  id: string;
  name: string;
  budgetLimit: number; // monthly limit in USD
  color: string;
  icon: string;
  type: CategoryType;
}

export interface BankAccount {
  id: string;
  institutionId: string;
  institutionName: string;
  accountName: string;
  accountType: 'checking' | 'savings' | 'credit' | 'investment';
  mask: string;
  balance: number;
  lastSynced: string;
  status: 'connected' | 'syncing' | 'error';
  color: string;
}

export interface RecurringBill {
  id: string;
  title: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  frequency: 'monthly' | 'yearly' | 'weekly' | 'quarterly';
  category: string;
  isAutopay: boolean;
  isPaid: boolean;
  reminderDaysBefore: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  category: string;
  color: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'alert' | 'bill' | 'anomaly' | 'sync' | 'info';
  read: boolean;
  actionUrl?: string;
}

export interface MLForecastResult {
  spent_so_far: number;
  projected_total: number;
  daily_burn_rate: number;
  days_remaining: number;
  projected_variance: number;
  burn_status: 'on_track' | 'near_limit' | 'over_budget';
  recommended_daily_cap: number;
  curve: Array<{
    day: number;
    actual: number | null;
    forecast: number;
    is_projected: boolean;
  }>;
}

export interface MLAnomaly {
  transaction_id: string;
  description: string;
  amount: number;
  category: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role?: string;
  phone?: string;
  jobTitle?: string;
  currency?: string;
  timezone?: string;
  token?: string;
  lastLogin?: string;
  biometricRegistered?: boolean;
}

export interface BudgetAppData {
  transactions: Transaction[];
  categories: Category[];
  accounts: BankAccount[];
  bills: RecurringBill[];
  goals: SavingsGoal[];
  monthlyBudgetTotal: number;
  savingsTarget: number;
  currency: string;
  biometricEnabled: boolean;
  biometricPin: string;
  autoLockMinutes: number;
  lastModified: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  model?: string;
}

export interface AIFinancialAudit {
  score: number;
  summary: string;
  strengths: string[];
  vulnerabilities: string[];
  recommendations: Array<{
    title: string;
    impact: 'high' | 'medium' | 'low';
    estimatedMonthlySavings: number;
    description: string;
  }>;
  savingsRateEvaluation: string;
  emergencyFundStatus: string;
}

export interface AIParsedExpense {
  description: string;
  amount: number;
  type: 'expense' | 'income';
  category: string;
  date: string;
  notes?: string;
  confidence: number;
}
