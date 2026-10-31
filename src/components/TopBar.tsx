import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Cloud,
  CloudOff,
  Lock,
  Moon,
  Plus,
  Sun,
  LogOut,
  ChevronDown,
  ShieldCheck,
  User,
  Search,
  Globe,
  Sparkles,
} from 'lucide-react';
import { AuthUser } from '../types/budget';
import { SUPPORTED_CURRENCIES, getCurrencyInfo } from '../services/currencyService';

interface TopBarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isDark: boolean;
  onToggleDark: () => void;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedText: string;
  onManualSync: () => void;
  onLockVault: () => void;
  onOpenNewTransaction: () => void;
  unreadNotificationCount: number;
  onOpenNotifications: () => void;
  currentUser: AuthUser | null;
  onLogout: () => void;
  currentCurrency: string;
  onSelectCurrency: (code: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onSelectTab,
  isDark,
  onToggleDark,
  isOnline,
  isSyncing,
  lastSyncedText,
  onManualSync,
  onLockVault,
  onOpenNewTransaction,
  unreadNotificationCount,
  onOpenNotifications,
  currentUser,
  onLogout,
  currentCurrency,
  onSelectCurrency,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');

  const userMenuRef = useRef<HTMLDivElement>(null);
  const currencyMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (currencyMenuRef.current && !currencyMenuRef.current.contains(e.target as Node)) {
        setIsCurrencyMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'reports', label: 'Monthly Reports' },
    { id: 'ai', label: 'AI Advisor', isAi: true },
    { id: 'banks', label: 'Bank Sync' },
    { id: 'calendar', label: 'Bills & Calendar' },
    { id: 'categories', label: 'Categories' },
    { id: 'profile', label: 'Profile' },
  ];

  const activeCurrencyInfo = getCurrencyInfo(currentCurrency);

  const filteredCurrencies = SUPPORTED_CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
      c.name.toLowerCase().includes(currencySearch.toLowerCase()) ||
      c.country.toLowerCase().includes(currencySearch.toLowerCase())
  );

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectTab('dashboard')}
              className="text-left group cursor-pointer focus:outline-none"
            >
              <span className="text-xl font-bold tracking-tight text-neutral-950 dark:text-white flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center font-black text-base shadow-sm">
                  K
                </span>
                KashFlow
              </span>
            </button>
          </div>

          {/* Zone 2: Clean navigation links */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-3 lg:gap-5 text-sm font-medium text-neutral-600 dark:text-neutral-400">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`py-1.5 px-2.5 rounded-md transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40'
                      : item.isAi
                      ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20'
                      : 'hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60'
                  }`}
                >
                  {item.isAi && <Sparkles className="w-3.5 h-3.5 text-emerald-500" />}
                  <span>{item.label}</span>
                  {item.isAi && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                      AI
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Actions, indicators, and user session menu */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Global Currency Picker */}
            <div className="relative" ref={currencyMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsCurrencyMenuOpen(!isCurrencyMenuOpen);
                  setCurrencySearch('');
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-800/70 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer shadow-2xs"
                title="Change Country Currency"
                aria-expanded={isCurrencyMenuOpen}
              >
                <span>{activeCurrencyInfo.flag}</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{activeCurrencyInfo.symbol}</span>
                <span className="font-mono text-[11px] hidden sm:inline">{activeCurrencyInfo.code}</span>
                <ChevronDown className="w-3 h-3 text-neutral-400" />
              </button>

              {/* Currency Dropdown Popover */}
              {isCurrencyMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 max-h-96 rounded-2xl bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200 dark:border-neutral-800 p-2 z-50 flex flex-col animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2 pb-2 border-b border-neutral-100 dark:border-neutral-800/80">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-900 dark:text-white mb-2">
                      <span className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-emerald-600" />
                        Select Country Currency
                      </span>
                      <span className="text-[10px] text-neutral-400 font-normal">Active: {activeCurrencyInfo.code}</span>
                    </div>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-400" />
                      <input
                        type="text"
                        value={currencySearch}
                        onChange={(e) => setCurrencySearch(e.target.value)}
                        placeholder="Search currency or country..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="overflow-y-auto max-h-64 py-1 space-y-0.5 no-scrollbar">
                    {filteredCurrencies.map((curr) => {
                      const isSelected = curr.code === currentCurrency;
                      return (
                        <button
                          key={curr.code}
                          type="button"
                          onClick={() => {
                            onSelectCurrency(curr.code);
                            setIsCurrencyMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                            isSelected
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold'
                              : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base leading-none">{curr.flag}</span>
                            <div className="truncate">
                              <span className="font-medium mr-1.5">{curr.name}</span>
                              <span className="text-[10px] text-neutral-400 truncate">({curr.country})</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 font-mono shrink-0 pl-2">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{curr.symbol}</span>
                            <span className="text-[11px] text-neutral-500">{curr.code}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Sync / Offline status indicator */}
            <button
              onClick={onManualSync}
              disabled={isSyncing}
              title={isOnline ? `Cloud synced (${lastSyncedText}). Click to sync.` : 'Operating offline. Changes cached locally.'}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-md border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              {isOnline ? (
                <Cloud className={`w-3.5 h-3.5 ${isSyncing ? 'text-emerald-500 animate-spin' : 'text-emerald-600 dark:text-emerald-400'}`} />
              ) : (
                <CloudOff className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span className="hidden xl:inline">
                {isSyncing ? 'Syncing...' : isOnline ? 'Cloud Synced' : 'Offline Mode'}
              </span>
            </button>

            {/* Notification button */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              title="Notifications & Alerts"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-neutral-900" />
              )}
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={onToggleDark}
              className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Dark Mode"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Biometric Quick Lock button */}
            <button
              onClick={onLockVault}
              className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              title="Quick Lock Vault (Biometric PIN required to resume)"
              aria-label="Lock Vault"
            >
              <Lock className="w-4 h-4" />
            </button>

            {/* Primary Record Transaction Action */}
            <button
              onClick={onOpenNewTransaction}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record</span>
            </button>

            {/* User Profile Menu & Logout */}
            <div className="relative ml-1" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full sm:rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/70 transition-all cursor-pointer"
                title="Account & Vault Profile"
                aria-expanded={isUserMenuOpen}
              >
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-emerald-500/40"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    {currentUser?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white leading-tight truncate max-w-[90px]">
                    {currentUser?.name || 'Vault User'}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 leading-tight">
                    {currentUser?.role || 'Vault Owner'}
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 text-neutral-400 hidden sm:block" />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200 dark:border-neutral-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800/80 mb-1">
                    <p className="text-xs font-bold text-neutral-950 dark:text-white truncate">
                      {currentUser?.name || 'Vault User'}
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                      {currentUser?.email || 'user@kashflow.io'}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <ShieldCheck className="w-3 h-3" />
                        <span>{currentUser?.role || 'Vault Owner'}</span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {activeCurrencyInfo.symbol} {activeCurrencyInfo.code}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onSelectTab('profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>My Profile & Settings</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLockVault();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Lock Vault Screen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onToggleDark();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      {isDark ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
                      <span>Theme: {isDark ? 'Dark Mode' : 'Light Mode'}</span>
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Switch
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenNewTransaction();
                    }}
                    className="w-full sm:hidden flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Record Transaction</span>
                  </button>

                  <div className="border-t border-neutral-100 dark:border-neutral-800/80 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out & Exit to Login</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-2 border-t border-neutral-100 dark:border-neutral-800/80 no-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`px-3 py-1 text-xs rounded-md whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                currentTab === item.id
                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-semibold'
                  : item.isAi
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              {item.isAi && <Sparkles className="w-3 h-3 text-emerald-500" />}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
