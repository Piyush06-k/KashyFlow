import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  ArrowRight,
  PieChart,
  Wallet,
  Zap,
  Copy,
  Check,
  Scale,
  Receipt,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { BudgetAppData, Category, Transaction, AIMessage, AIFinancialAudit, AIParsedExpense } from '../types/budget';
import { formatMoney, getCurrencySymbol } from '../services/currencyService';
import {
  sendAIChat,
  runAIFinancialAudit,
  parseNaturalLanguageExpense,
  rebalanceBudget503020,
  FinancialContext,
} from '../services/aiService';

interface AIAdvisorViewProps {
  appData: BudgetAppData;
  currency: string;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onUpdateCategory: (id: string, updates: Partial<Category>) => void;
  onNavigate: (tab: string) => void;
  onNotify: (title: string, message: string, type: 'sync' | 'alert' | 'info') => void;
}

export const AIAdvisorView: React.FC<AIAdvisorViewProps> = ({
  appData,
  currency,
  onAddTransaction,
  onUpdateCategory,
  onNavigate,
  onNotify,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'audit' | 'quick_add' | 'rebalance'>('chat');
  const symbol = getCurrencySymbol(currency);

  // Financial Context Computation
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const currentMonthTxns = appData.transactions.filter((t) => {
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
  const totalBalance = appData.accounts.reduce((acc, a) => acc + a.balance, 0);

  const categorySpentMap: Record<string, number> = {};
  currentMonthTxns.forEach((t) => {
    if (t.type === 'expense') {
      categorySpentMap[t.category] = (categorySpentMap[t.category] || 0) + Math.abs(t.amount);
    }
  });

  const financialContext: FinancialContext = {
    currency,
    symbol,
    totalBalance,
    accountCount: appData.accounts.length,
    currentMonthIncome: totalIncome,
    currentMonthExpenses: totalExpenses,
    netSavings,
    savingsRate,
    categories: appData.categories,
    categorySpentMap,
    bills: appData.bills,
    goals: appData.goals,
    recentTransactions: appData.transactions.slice(0, 15),
  };

  // --- TAB 1: Chat State ---
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'welcome_msg',
      role: 'assistant',
      content: `Hello! I'm your **KashFlow AI Financial Advisor** powered by Gemini.

I have real-time visibility into your ledger:
- **Net Liquid Balance:** ${formatMoney(totalBalance, currency)}
- **Monthly Income:** ${formatMoney(totalIncome, currency)} | **Spend:** ${formatMoney(totalExpenses, currency)}
- **Current Savings Rate:** ${savingsRate.toFixed(1)}%

Ask me anything about your finances, check if you can afford a purchase, or click one of the quick suggestions below!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      model: 'gemini-3.8-flash',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeSubTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, activeSubTab]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isChatLoading) return;

    const userMsg: AIMessage = {
      id: 'user_' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputValue('');
    setIsChatLoading(true);

    try {
      const response = await sendAIChat(newMessages, financialContext);
      const assistantMsg: AIMessage = {
        id: 'ai_' + Date.now(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: response.model,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: AIMessage = {
        id: 'err_' + Date.now(),
        role: 'assistant',
        content: `Sorry, I encountered an issue processing your request: ${err.message || 'Unknown error'}. Please try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // --- TAB 2: Audit State ---
  const [auditData, setAuditData] = useState<AIFinancialAudit | null>(null);
  const [isAuditLoading, setIsAuditLoading] = useState(false);

  const handleRunAudit = async () => {
    setIsAuditLoading(true);
    try {
      const result = await runAIFinancialAudit(financialContext);
      setAuditData(result);
      onNotify('AI Audit Completed', `Financial health score: ${result.score}/100`, 'info');
    } catch (err: any) {
      onNotify('Audit Error', err.message || 'Failed to complete audit', 'alert');
    } finally {
      setIsAuditLoading(false);
    }
  };

  // Automatically run baseline audit once when tab opens if null
  useEffect(() => {
    if (activeSubTab === 'audit' && !auditData && !isAuditLoading) {
      handleRunAudit();
    }
  }, [activeSubTab]);

  // --- TAB 3: Smart Expense Quick-Add State ---
  const [naturalInput, setNaturalInput] = useState('');
  const [isParsingExpense, setIsParsingExpense] = useState(false);
  const [parsedExpense, setParsedExpense] = useState<AIParsedExpense | null>(null);
  const [hasAddedExpense, setHasAddedExpense] = useState(false);

  const handleParseExpense = async (sampleText?: string) => {
    const raw = (sampleText || naturalInput).trim();
    if (!raw || isParsingExpense) return;
    if (sampleText) setNaturalInput(sampleText);

    setIsParsingExpense(true);
    setParsedExpense(null);
    setHasAddedExpense(false);

    try {
      const result = await parseNaturalLanguageExpense(raw, appData.categories, currency);
      setParsedExpense(result);
    } catch (err: any) {
      onNotify('Parser Error', err.message || 'Failed to parse expense text', 'alert');
    } finally {
      setIsParsingExpense(false);
    }
  };

  const handleConfirmAddExpense = () => {
    if (!parsedExpense) return;
    const defaultAccount = appData.accounts[0]?.id || 'acc-manual-01';

    onAddTransaction({
      description: parsedExpense.description,
      amount: parsedExpense.type === 'expense' ? -Math.abs(parsedExpense.amount) : Math.abs(parsedExpense.amount),
      category: parsedExpense.category,
      date: parsedExpense.date || new Date().toISOString().split('T')[0],
      type: parsedExpense.type,
      accountId: defaultAccount,
      notes: parsedExpense.notes,
    });

    setHasAddedExpense(true);
    onNotify('Transaction Added', `Recorded ${formatMoney(parsedExpense.amount, currency)} under ${parsedExpense.category}.`, 'sync');
  };

  // --- TAB 4: Budget Rebalancer State ---
  const [rebalanceData, setRebalanceData] = useState<any>(null);
  const [isRebalancing, setIsRebalancing] = useState(false);

  const handleRunRebalance = async () => {
    setIsRebalancing(true);
    try {
      const effectiveIncome = totalIncome > 0 ? totalIncome : 50000;
      const result = await rebalanceBudget503020(effectiveIncome, appData.categories, currency, symbol);
      setRebalanceData(result);
    } catch (err: any) {
      onNotify('Rebalance Error', err.message || 'Failed to rebalance budget', 'alert');
    } finally {
      setIsRebalancing(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'rebalance' && !rebalanceData && !isRebalancing) {
      handleRunRebalance();
    }
  }, [activeSubTab]);

  const handleApplyRecommendedLimit = (catId: string, newLimit: number) => {
    const existing = appData.categories.find((c) => c.id === catId);
    if (existing) {
      onUpdateCategory(catId, { budgetLimit: newLimit });
      onNotify('Limit Updated', `Updated limit for ${existing.name} to ${formatMoney(newLimit, currency)}.`, 'sync');
      // Update local state
      setRebalanceData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          rebalancePlans: prev.rebalancePlans.map((p: any) => (p.id === catId ? { ...p, currentLimit: newLimit, delta: 0 } : p)),
        };
      });
    }
  };

  // Suggested Prompts
  const suggestedPrompts = [
    { label: 'Spending Leaks Audit', prompt: `Audit my recent spending in ${currency}. Where am I leaking money and where can I cut costs?` },
    { label: 'Can I Afford 20,000?', prompt: `Can I afford a purchase of ${symbol}20,000 this month without exceeding my monthly margin?` },
    { label: 'Emergency Fund Plan', prompt: `How many months of emergency reserve do I currently hold, and how can I build a 6-month safety net?` },
    { label: '50/30/20 Rule Breakdown', prompt: `Analyze my monthly income and expenses against the 50/30/20 budget framework.` },
    { label: 'Audit Recurring Bills', prompt: `Review my recurring bills and give me recommendations on how to optimize subscription spending.` },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-700 to-neutral-900 text-white p-6 sm:p-8 shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 rounded-full bg-emerald-400/10 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Gemini 3.8 Flash Financial Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              AI Financial Advisor & Wealth Engine
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-xl">
              Real-time cash flow coaching, intelligent spending leak detection, automated budget health audits, and natural language expense recording.
            </p>
          </div>

          {/* Quick Metrics Badge Grid */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3 text-left">
              <span className="text-[10px] text-emerald-200 uppercase tracking-wider block font-semibold">Liquid Net Worth</span>
              <span className="text-lg font-bold font-mono tabular-nums">{formatMoney(totalBalance, currency)}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3 text-left">
              <span className="text-[10px] text-emerald-200 uppercase tracking-wider block font-semibold">Savings Rate</span>
              <span className="text-lg font-bold font-mono tabular-nums">{savingsRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sub-Navigation Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800 gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubTab('chat')}
          className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer ${
            activeSubTab === 'chat'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>Interactive Advisor</span>
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer ${
            activeSubTab === 'audit'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Financial Health Audit</span>
        </button>

        <button
          onClick={() => setActiveSubTab('quick_add')}
          className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer ${
            activeSubTab === 'quick_add'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Smart Expense Quick-Add</span>
        </button>

        <button
          onClick={() => setActiveSubTab('rebalance')}
          className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer ${
            activeSubTab === 'rebalance'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>50/30/20 Rebalancer</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: Interactive AI Financial Advisor Chat          */}
      {/* ======================================================== */}
      {activeSubTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Chat Interface */}
          <div className="lg:col-span-3 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col h-[650px] overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 px-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-950 dark:text-white flex items-center gap-2">
                    KashFlow Wealth Coach
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      Live Ledger Synced
                    </span>
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Grounded in your real accounts, categories, and monthly cash flow in {currency}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMessages([
                    {
                      id: 'welcome_msg_reset',
                      role: 'assistant',
                      content: `Conversation reset. How can I assist your financial planning today?`,
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                  ]);
                }}
                className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Clear Chat History"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset Chat</span>
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {messages.map((msg) => {
                const isAssistant = msg.role === 'assistant';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                        isAssistant
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-neutral-800 dark:bg-neutral-700 text-white'
                      }`}
                    >
                      {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>

                    <div
                      className={`group relative max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                        isAssistant
                          ? 'bg-neutral-100/80 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100 border border-neutral-200/80 dark:border-neutral-700/60'
                          : 'bg-emerald-600 text-white font-medium'
                      }`}
                    >
                      {/* Copy button on assistant response */}
                      {isAssistant && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(msg.id, msg.content)}
                          className="absolute top-2 right-2 p-1.5 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity bg-white/70 dark:bg-neutral-900/70"
                          title="Copy response"
                        >
                          {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}

                      {/* Content rendering */}
                      <div className="whitespace-pre-wrap space-y-2">
                        {msg.content}
                      </div>

                      <div className={`mt-1.5 flex items-center gap-2 text-[10px] ${isAssistant ? 'text-neutral-400 dark:text-neutral-500' : 'text-emerald-100'}`}>
                        <span>{msg.timestamp}</span>
                        {msg.model && <span>· {msg.model}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isChatLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="bg-neutral-100/80 dark:bg-neutral-800/80 rounded-2xl px-4 py-3 text-xs border border-neutral-200/80 dark:border-neutral-700/60 flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
                    <span>Analyzing live budget data and formulating guidance...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Prompt Suggestion Chips */}
            <div className="px-4 py-2 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-900/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500 shrink-0 mr-1 flex items-center gap-1">
                <Lightbulb className="w-3 h-3 text-amber-500" />
                Prompt Chips:
              </span>
              {suggestedPrompts.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(item.prompt)}
                  disabled={isChatLoading}
                  className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/90 text-neutral-700 dark:text-neutral-300 hover:border-emerald-500 dark:hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 sm:p-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-2 bg-white dark:bg-neutral-900"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={`Ask about your ${currency} budget, affordability, or savings strategy...`}
                disabled={isChatLoading}
                className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isChatLoading}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Context Sidebar */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-neutral-950 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Active Ledger Snapshot
              </h4>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="text-neutral-500 dark:text-neutral-400">Currency</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">{currency} ({symbol})</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="text-neutral-500 dark:text-neutral-400">Total Liquid Funds</span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-white">{formatMoney(totalBalance, currency)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="text-neutral-500 dark:text-neutral-400">Monthly Inflow</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(totalIncome, currency)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="text-neutral-500 dark:text-neutral-400">Monthly Outflow</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{formatMoney(totalExpenses, currency)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 dark:text-neutral-400">Savings Margin</span>
                  <span className={`font-mono font-bold ${netSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                    {formatMoney(netSavings, currency)} ({savingsRate.toFixed(1)}%)
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="w-full py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors cursor-pointer text-center block"
                >
                  View Full Dashboard →
                </button>
              </div>
            </div>

            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 rounded-3xl p-5 border border-emerald-200/80 dark:border-emerald-800/60 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-950 dark:text-emerald-200">
                <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>AI Prompt Ideas</span>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 text-[11px] leading-relaxed">
                You can ask questions in plain English or your preferred language:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-neutral-600 dark:text-neutral-300 text-[11px]">
                <li>"How much can I safely spend on dining out this weekend?"</li>
                <li>"What happens to my month-end savings if my rent increases by {symbol}2,000?"</li>
                <li>"Identify my top 3 biggest transactions this month."</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: Financial Health Audit                         */}
      {/* ======================================================== */}
      {activeSubTab === 'audit' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Comprehensive Financial Health Audit
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Automated multi-factor evaluation of your savings rate, emergency runway, and budget variances.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunAudit}
              disabled={isAuditLoading}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAuditLoading ? 'animate-spin' : ''}`} />
              <span>{isAuditLoading ? 'Analyzing...' : 'Re-run AI Audit'}</span>
            </button>
          </div>

          {auditData && (
            <div className="space-y-6">
              {/* Score and Executive Summary Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col items-center justify-center text-center">
                  <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-2">
                    Overall Financial Health Score
                  </div>
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        className="stroke-neutral-200 dark:stroke-neutral-800"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        className="stroke-emerald-500 transition-all duration-1000"
                        strokeWidth="10"
                        strokeDasharray={264}
                        strokeDashoffset={264 - (264 * auditData.score) / 100}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-3xl font-black text-neutral-950 dark:text-white font-mono">{auditData.score}</span>
                      <span className="text-[10px] text-neutral-400 uppercase tracking-wider">out of 100</span>
                    </div>
                  </div>
                  <span className={`mt-3 text-xs font-bold px-3 py-1 rounded-full ${
                    auditData.score >= 80
                      ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : auditData.score >= 60
                      ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                  }`}>
                    {auditData.score >= 80 ? 'Excellent Stability' : auditData.score >= 60 ? 'Moderate Health' : 'Needs Immediate Attention'}
                  </span>
                </div>

                <div className="md:col-span-2 bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                      Executive Evaluation
                    </span>
                    <h4 className="text-base font-bold text-neutral-950 dark:text-white mb-2">
                      Cash Flow & Liquidity Assessment
                    </h4>
                    <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                      {auditData.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 mt-4 text-xs">
                    <div>
                      <span className="text-neutral-500 block text-[11px]">Savings Rate Rating</span>
                      <span className="font-semibold text-neutral-900 dark:text-white">{auditData.savingsRateEvaluation}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[11px]">Emergency Runway</span>
                      <span className="font-semibold text-neutral-900 dark:text-white">{auditData.emergencyFundStatus}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strengths & Vulnerabilities Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Identified Financial Strengths</span>
                  </div>
                  <ul className="space-y-2.5">
                    {auditData.strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-neutral-700 dark:text-neutral-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Areas of Vulnerability</span>
                  </div>
                  <ul className="space-y-2.5">
                    {auditData.vulnerabilities.map((vuln, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-neutral-700 dark:text-neutral-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                        <span>{vuln}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Actionable Recommendations */}
              <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-neutral-950 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Prioritized High-Impact Actions
                  </h4>
                  <span className="text-xs text-neutral-500">
                    Potential Monthly Savings: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatMoney(auditData.recommendations.reduce((acc, r) => acc + (r.estimatedMonthlySavings || 0), 0), currency)}/mo
                    </strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {auditData.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            rec.impact === 'high'
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                              : rec.impact === 'medium'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          }`}>
                            {rec.impact} Impact
                          </span>
                          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            +{formatMoney(rec.estimatedMonthlySavings, currency)}/mo
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-neutral-950 dark:text-white mb-1">
                          {rec.title}
                        </h5>
                        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                          {rec.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveSubTab('chat');
                          handleSendMessage(`Tell me more about how to implement this recommendation: "${rec.title}"`);
                        }}
                        className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60"
                      >
                        <span>Discuss with AI</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 3: Smart Expense Quick-Add (NLP Receipt Parser)   */}
      {/* ======================================================== */}
      {activeSubTab === 'quick_add' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-950 dark:text-white">
                  Natural Language Expense & Receipt Parser
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Type or paste any messy expense note. Gemini AI will categorize it, extract exact amounts, and let you add it to your ledger with 1 click.
                </p>
              </div>
            </div>

            {/* Quick Sample Prompts */}
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-neutral-400 block mb-1.5">Try an example:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  `Dinner with colleagues ${symbol}1,850 at Barbeque Nation`,
                  `Weekly grocery shopping ${symbol}3,400 at Supermarket`,
                  `Flight tickets booked on airline for ${symbol}8,500 under travel`,
                  `Freelance UI design client deposit ${symbol}45,000 received`,
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleParseExpense(sample)}
                    className="text-xs px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300 hover:border-emerald-500 hover:text-emerald-600 transition-colors cursor-pointer"
                  >
                    "{sample}"
                  </button>
                ))}
              </div>
            </div>

            {/* Input Box */}
            <div className="space-y-3 pt-2">
              <textarea
                value={naturalInput}
                onChange={(e) => setNaturalInput(e.target.value)}
                placeholder={`e.g. Paid ${symbol}1,250 for Italian dinner with Sarah, split half by cash`}
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleParseExpense()}
                  disabled={!naturalInput.trim() || isParsingExpense}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isParsingExpense ? 'Analyzing with AI...' : 'Parse & Extract Transaction'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Parsed Result Card */}
          {parsedExpense && (
            <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-950 dark:text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Structured Transaction Candidate</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  {Math.round(parsedExpense.confidence * 100)}% Match Confidence
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-neutral-500 block mb-1">Description</span>
                  <span className="font-bold text-neutral-950 dark:text-white text-sm">{parsedExpense.description}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block mb-1">Extracted Amount</span>
                  <span className={`font-mono font-bold text-base ${parsedExpense.type === 'income' ? 'text-emerald-600' : 'text-neutral-900 dark:text-white'}`}>
                    {parsedExpense.type === 'income' ? '+' : '-'}{formatMoney(parsedExpense.amount, currency)}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block mb-1">Suggested Category</span>
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 font-semibold text-neutral-800 dark:text-neutral-200">
                    {parsedExpense.category}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block mb-1">Date</span>
                  <span className="font-mono text-neutral-700 dark:text-neutral-300">{parsedExpense.date}</span>
                </div>
              </div>

              {parsedExpense.notes && (
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 text-xs text-neutral-600 dark:text-neutral-300">
                  <strong className="text-neutral-900 dark:text-white">Details:</strong> {parsedExpense.notes}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <span className="text-xs text-neutral-400">
                  Adds directly to your synchronized ledger accounts.
                </span>

                <button
                  type="button"
                  onClick={handleConfirmAddExpense}
                  disabled={hasAddedExpense}
                  className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                    hasAddedExpense
                      ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{hasAddedExpense ? 'Added to Ledger!' : 'Record Transaction in Ledger'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 4: 50/30/20 Budget Rebalancer                    */}
      {/* ======================================================== */}
      {activeSubTab === 'rebalance' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-neutral-950 dark:text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                50/30/20 Budget Rebalancing Engine
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Aligns your monthly category spending envelopes with the standard wealth-building framework: 50% Needs, 30% Wants, 20% Savings.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunRebalance}
              disabled={isRebalancing}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRebalancing ? 'animate-spin' : ''}`} />
              <span>{isRebalancing ? 'Rebalancing...' : 'Recalculate Proportions'}</span>
            </button>
          </div>

          {rebalanceData && (
            <div className="space-y-6">
              {/* 3 Pillar Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200 dark:border-neutral-800 shadow-sm">
                  <div className="flex items-center justify-between text-neutral-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Needs (50%)</span>
                    <span className="text-xs font-mono">Essentials</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-neutral-950 dark:text-white">
                    {formatMoney(rebalanceData.targets.needs.amount, currency)}
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Housing, utilities, groceries, healthcare, transportation
                  </p>
                </div>

                <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200 dark:border-neutral-800 shadow-sm">
                  <div className="flex items-center justify-between text-neutral-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Wants (30%)</span>
                    <span className="text-xs font-mono">Discretionary</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-neutral-950 dark:text-white">
                    {formatMoney(rebalanceData.targets.wants.amount, currency)}
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Dining, entertainment, shopping, hobbies, personal care
                  </p>
                </div>

                <div className="bg-white dark:bg-neutral-900 rounded-3xl p-5 border border-neutral-200 dark:border-neutral-800 shadow-sm">
                  <div className="flex items-center justify-between text-neutral-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Savings & Debt (20%)</span>
                    <span className="text-xs font-mono">Wealth Building</span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {formatMoney(rebalanceData.targets.savings.amount, currency)}
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Emergency funds, investments, extra debt principal payoffs
                  </p>
                </div>
              </div>

              {/* Category-by-Category Envelope Recommendations Table */}
              <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-neutral-950 dark:text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Recommended Category Envelope Adjustments
                  </h4>
                  <span className="text-xs text-neutral-500">
                    Based on monthly inflow of {formatMoney(rebalanceData.totalIncome, currency)}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500">
                        <th className="pb-3 font-semibold">Category Envelope</th>
                        <th className="pb-3 font-semibold">Classification</th>
                        <th className="pb-3 font-semibold text-right">Current Limit</th>
                        <th className="pb-3 font-semibold text-right">AI Recommended</th>
                        <th className="pb-3 font-semibold text-right">Adjustment</th>
                        <th className="pb-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                      {rebalanceData.rebalancePlans.map((plan: any) => {
                        const isIncrease = plan.delta > 0;
                        const isZero = plan.delta === 0;
                        return (
                          <tr key={plan.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors">
                            <td className="py-3.5 font-bold text-neutral-900 dark:text-white">
                              {plan.name}
                            </td>
                            <td className="py-3.5 capitalize">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                plan.type === 'essential'
                                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                                  : plan.type === 'savings'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                              }`}>
                                {plan.type || 'discretionary'}
                              </span>
                            </td>
                            <td className="py-3.5 text-right font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                              {formatMoney(plan.currentLimit, currency)}
                            </td>
                            <td className="py-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {formatMoney(plan.recommendedLimit, currency)}
                            </td>
                            <td className="py-3.5 text-right font-mono">
                              {isZero ? (
                                <span className="text-neutral-400">Balanced</span>
                              ) : isIncrease ? (
                                <span className="text-emerald-600 font-semibold">+{formatMoney(plan.delta, currency)}</span>
                              ) : (
                                <span className="text-rose-600 font-semibold">{formatMoney(plan.delta, currency)}</span>
                              )}
                            </td>
                            <td className="py-3.5 text-right">
                              {isZero ? (
                                <span className="text-neutral-400 text-[11px]">Up to date</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleApplyRecommendedLimit(plan.id, plan.recommendedLimit)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800"
                                >
                                  Apply Limit
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
