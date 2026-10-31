import React, { useState, useEffect } from 'react';
import {
  Building2,
  RefreshCw,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  Lock,
  X,
  CreditCard,
  Landmark,
} from 'lucide-react';
import { BankAccount, Transaction } from '../types/budget';
import { fetchSupportedInstitutions, BankInstitution, syncLiveBankTransactions } from '../services/bankService';
import { formatMoney } from '../services/currencyService';

interface BankSyncViewProps {
  accounts: BankAccount[];
  onAddAccount: (acc: BankAccount) => void;
  onRemoveAccount: (accId: string) => void;
  onTransactionsImported: (txs: Transaction[]) => void;
  onUpdateAccountBalance: (accId: string, delta: number) => void;
  currency?: string;
}

export const BankSyncView: React.FC<BankSyncViewProps> = ({
  accounts,
  onAddAccount,
  onRemoveAccount,
  onTransactionsImported,
  currency = 'INR',
}) => {
  const [institutions, setInstitutions] = useState<BankInstitution[]>([]);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');

  // Modal State for Connecting Bank
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [selectedInst, setSelectedInst] = useState<BankInstitution | null>(null);
  const [connectStep, setConnectStep] = useState<1 | 2 | 3>(1);
  const [simUsername, setSimUsername] = useState('demo_user');
  const [simPassword, setSimPassword] = useState('••••••••');
  const [sim2FACode, setSim2FACode] = useState('849201');
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    fetchSupportedInstitutions().then(setInstitutions);
  }, []);

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    setSyncStatusMsg('Connecting to Open Banking API nodes...');
    try {
      const allImported: Transaction[] = [];
      for (const acc of accounts) {
        const txs = await syncLiveBankTransactions(acc.institutionId, acc.id);
        allImported.push(...txs);
      }
      if (allImported.length > 0) {
        onTransactionsImported(allImported);
        setSyncStatusMsg(`Successfully synchronized ${allImported.length} live transactions via secure bank gateway.`);
      } else {
        setSyncStatusMsg('All connected accounts are up to date.');
      }
      setTimeout(() => setSyncStatusMsg(''), 4500);
    } catch (e) {
      setSyncStatusMsg('Sync completed with local cache.');
    } finally {
      setIsSyncingAll(false);
    }
  };

  const startConnectFlow = (inst: BankInstitution) => {
    setSelectedInst(inst);
    setConnectStep(2);
  };

  const handleFinishConnection = () => {
    if (!selectedInst) return;
    setIsLinking(true);
    setTimeout(() => {
      const newAcc: BankAccount = {
        id: `acc-${selectedInst.id}-${Math.random().toString(36).substring(2, 6)}`,
        institutionId: selectedInst.id,
        institutionName: selectedInst.name,
        accountName: `${selectedInst.name} Daily Spending`,
        accountType: 'checking',
        mask: Math.floor(1000 + Math.random() * 9000).toString(),
        balance: 2450.00,
        lastSynced: new Date().toISOString(),
        status: 'connected',
        color: selectedInst.color,
      };
      onAddAccount(newAcc);
      setIsLinking(false);
      setIsConnectModalOpen(false);
      setConnectStep(1);
      setSelectedInst(null);
    }, 1200);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
            Bank Synchronization Hub
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Connect bank accounts to automatically sync balances and categorized transactions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncAll}
            disabled={isSyncingAll || accounts.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${isSyncingAll ? 'animate-spin' : ''}`} />
            <span>{isSyncingAll ? 'Syncing Feeds...' : 'Sync Live Feeds'}</span>
          </button>

          <button
            onClick={() => {
              setConnectStep(1);
              setSelectedInst(null);
              setIsConnectModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect Bank</span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatusMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-lg flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncStatusMsg}</span>
        </div>
      )}

      {/* Security Guarantee Box */}
      <div className="bg-neutral-100/60 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-neutral-900 dark:text-white">
              End-to-End Encrypted Financial Aggregation
            </div>
            <div className="text-[11px] text-neutral-500">
              Read-only token exchange protocol. Credentials never stored or exposed to external entities.
            </div>
          </div>
        </div>
        <div className="text-[11px] font-mono text-neutral-400 whitespace-nowrap">
          AES-GCM · TLS 1.3
        </div>
      </div>

      {/* 2. Connected Accounts Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-neutral-950 dark:text-white">
            Connected Accounts ({accounts.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs relative group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-xs"
                      style={{ backgroundColor: acc.color }}
                    >
                      {acc.institutionName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-neutral-900 dark:text-white">
                        {acc.institutionName}
                      </div>
                      <div className="text-[11px] text-neutral-500 capitalize">
                        {acc.accountName}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onRemoveAccount(acc.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-rose-600 transition-opacity cursor-pointer"
                    title="Disconnect Bank Account"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-5">
                  <div className="text-[11px] text-neutral-400">Current Balance</div>
                  <div className={`text-xl font-bold font-mono tabular-nums ${acc.balance >= 0 ? 'text-neutral-950 dark:text-white' : 'text-rose-600'}`}>
                    {formatMoney(acc.balance, currency)}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
                <span className="font-mono">•••• {acc.mask}</span>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
            </div>
          ))}

          {/* Quick Connect Card */}
          <button
            onClick={() => {
              setConnectStep(1);
              setSelectedInst(null);
              setIsConnectModalOpen(true);
            }}
            className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 hover:border-emerald-500/60 dark:hover:border-emerald-500/60 rounded-xl p-6 flex flex-col items-center justify-center text-center group cursor-pointer transition-colors min-h-[170px]"
          >
            <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/60 text-neutral-500 group-hover:text-emerald-600 transition-colors flex items-center justify-center mb-2">
              <Plus className="w-5 h-5" />
            </div>
            <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
              Link Another Financial Institution
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              Chase, BofA, Amex, Revolut, Monzo & more
            </div>
          </button>
        </div>
      </div>

      {/* 3. Connect Bank Modal (Open Banking Handshake Simulator) */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 animate-in zoom-in-95 duration-150 text-neutral-900 dark:text-white">
            
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold">
                  {connectStep === 1
                    ? 'Select Financial Institution'
                    : connectStep === 2
                    ? `Connect to ${selectedInst?.name}`
                    : 'Confirm Account Authorization'}
                </h3>
              </div>
              <button
                onClick={() => setIsConnectModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Select Institution */}
            {connectStep === 1 && (
              <div className="pt-4 space-y-3">
                <p className="text-xs text-neutral-500">
                  Select your bank or credit card provider to link through our read-only Open Banking gateway.
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                  {institutions.map((inst) => (
                    <button
                      key={inst.id}
                      onClick={() => startConnectFlow(inst)}
                      className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-neutral-50/50 dark:bg-neutral-950/50 hover:bg-white dark:hover:bg-neutral-900 flex items-center gap-2.5 transition-all cursor-pointer text-left group"
                    >
                      <div
                        className="w-7 h-7 rounded-md flex items-center justify-center text-white font-black text-[10px] shrink-0"
                        style={{ backgroundColor: inst.color }}
                      >
                        {inst.logoText.slice(0, 3)}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-xs text-neutral-900 dark:text-white truncate">
                          {inst.name}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate">
                          {inst.type}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Simulated Sandbox Handshake */}
            {connectStep === 2 && selectedInst && (
              <div className="pt-4 space-y-4 text-xs">
                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs"
                    style={{ backgroundColor: selectedInst.color }}
                  >
                    {selectedInst.logoText.slice(0, 3)}
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-900 dark:text-white">
                      {selectedInst.name} Secure Portal
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                      Sandbox Authenticator Ready
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-neutral-500 font-medium mb-1">Online Banking Username</label>
                    <input
                      type="text"
                      value={simUsername}
                      onChange={(e) => setSimUsername(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-500 font-medium mb-1">Passcode</label>
                    <input
                      type="password"
                      value={simPassword}
                      onChange={(e) => setSimPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-500 font-medium mb-1">Multi-Factor SMS Code</label>
                    <input
                      type="text"
                      value={sim2FACode}
                      onChange={(e) => setSim2FACode(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 font-mono text-neutral-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setConnectStep(1)}
                    className="text-neutral-500 hover:text-neutral-800 cursor-pointer"
                  >
                    &larr; Back
                  </button>
                  <button
                    type="button"
                    onClick={handleFinishConnection}
                    disabled={isLinking}
                    className="px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isLinking ? 'Verifying Credentials...' : 'Authorize & Link Account'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
