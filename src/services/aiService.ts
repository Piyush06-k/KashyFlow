import { AIMessage, AIFinancialAudit, AIParsedExpense, Category } from '../types/budget';

export interface FinancialContext {
  currency: string;
  symbol: string;
  totalBalance: number;
  accountCount: number;
  currentMonthIncome: number;
  currentMonthExpenses: number;
  netSavings: number;
  savingsRate: number;
  categories: Category[];
  categorySpentMap: Record<string, number>;
  bills: any[];
  goals: any[];
  recentTransactions: any[];
}

export async function sendAIChat(
  messages: AIMessage[],
  financialContext: FinancialContext
): Promise<{ message: string; model: string }> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, financialContext }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to consult AI advisor (${res.status})`);
  }

  const data = await res.json();
  return {
    message: data.message || 'No response generated.',
    model: data.model || 'gemini-3.8-flash',
  };
}

export async function runAIFinancialAudit(
  financialContext: FinancialContext
): Promise<AIFinancialAudit> {
  const res = await fetch('/api/ai/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ financialContext }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate AI financial audit (${res.status})`);
  }

  const data = await res.json();
  return data.audit;
}

export async function parseNaturalLanguageExpense(
  text: string,
  categories: Category[],
  currency: string
): Promise<AIParsedExpense> {
  const res = await fetch('/api/ai/parse-expense', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, categories, currency }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to parse expense with AI (${res.status})`);
  }

  const data = await res.json();
  return data.transaction;
}

export async function rebalanceBudget503020(
  income: number,
  categories: Category[],
  currency: string,
  symbol: string
): Promise<any> {
  const res = await fetch('/api/ai/rebalance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ income, categories, currency, symbol }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to rebalance budget with AI (${res.status})`);
  }

  const data = await res.json();
  return data.analysis;
}
