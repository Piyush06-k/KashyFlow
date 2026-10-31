import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  Fingerprint,
  ArrowRight,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { AuthUser } from '../types/budget';
import {
  loginWithEmail,
  registerWithEmail,
  loginWithBiometrics,
  DEMO_ACCOUNTS,
} from '../services/authService';
import { isBiometricsAvailable } from '../services/biometricService';

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
  isDark: boolean;
  onToggleDark: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  isDark,
  onToggleDark,
}) => {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('alex.morgan@kashflow.io');
  const [password, setPassword] = useState('kashflow123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasBiometrics, setHasBiometrics] = useState(false);

  useEffect(() => {
    isBiometricsAvailable().then(setHasBiometrics);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    if (mode === 'register' && !name.trim()) {
      setErrorMessage('Please enter your full name to set up the vault.');
      return;
    }

    setIsLoading(true);
    try {
      let user: AuthUser;
      if (mode === 'signin') {
        user = await loginWithEmail(email, password, rememberMe);
      } else {
        user = await registerWithEmail(name, email, password, rememberMe);
      }
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoSelect = async (demoEmail: string, demoName: string) => {
    setEmail(demoEmail);
    setPassword('kashflow123');
    setName(demoName);
    setErrorMessage('');
    setIsLoading(true);
    try {
      const user = await loginWithEmail(demoEmail, 'kashflow123', true);
      onLoginSuccess(user);
    } catch {
      // Auto-fallback
      const fallbackUser: AuthUser = {
        id: demoEmail.includes('demo') ? 'usr_demo_02' : 'usr_owner_01',
        name: demoName,
        email: demoEmail,
        role: demoEmail.includes('demo') ? 'Personal Account' : 'Vault Owner',
        avatar: demoEmail.includes('demo')
          ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&h=160&q=80'
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&h=160&q=80',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        token: `demo_token_${Date.now()}`,
        lastLogin: new Date().toISOString(),
      };
      onLoginSuccess(fallbackUser);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setErrorMessage('');
    setIsLoading(true);
    try {
      const user = await loginWithBiometrics();
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Biometric authentication was cancelled.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors">
      {/* Top bar with logo and theme toggle */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-emerald-500/20">
            K
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-neutral-950 dark:text-white">
              KashFlow
            </span>
            <span className="hidden sm:inline-block ml-2.5 px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80">
              Personal Budget Vault
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleDark}
            className="p-2.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md sm:max-w-lg bg-white dark:bg-neutral-900 rounded-3xl shadow-xl shadow-neutral-900/5 dark:shadow-black/40 border border-neutral-200/80 dark:border-neutral-800 p-6 sm:p-10 relative overflow-hidden">
          
          {/* Subtle top emerald gradient glow line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

          {/* Heading */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 text-emerald-600 dark:text-emerald-400 mb-3 shadow-sm">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
              {mode === 'signin' ? 'Sign In to Your Vault' : 'Create Vault Account'}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
              {mode === 'signin'
                ? 'Enter your credentials or use fast 1-click demo access to enter the website.'
                : 'Set up your personal budget vault with automated spending forecasts.'}
            </p>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl mb-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage('');
              }}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage('');
              }}
              className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              New Account
            </button>
          </div>

          {/* Quick 1-Click Demo Profiles */}
          <div className="mb-6 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl p-3.5 border border-emerald-200/60 dark:border-emerald-800/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Quick 1-Click Demo Access
              </span>
              <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                Instant Entry
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleDemoSelect(acc.email, acc.name)}
                  disabled={isLoading}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-neutral-900/90 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 border border-emerald-200/80 dark:border-emerald-800/60 text-left transition-all hover:scale-[1.01] active:scale-95 cursor-pointer shadow-xs"
                >
                  <img
                    src={acc.avatar}
                    alt={acc.name}
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-emerald-500/30"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                      {acc.name}
                    </p>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 truncate">
                      {acc.role}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-neutral-400"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@kashflow.io"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-neutral-400"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setPassword('kashflow123');
                      setErrorMessage('Password reset hint: default demo password is "kashflow123".');
                    }}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-neutral-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Remember session on this device</span>
              </label>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Unlock Vault & Enter Website' : 'Create Account & Enter'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Biometrics Quick Sign In Option */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-neutral-900 px-3 text-neutral-400 font-medium">
                Or Fast Biometric Access
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleBiometricLogin}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 border border-neutral-200 dark:border-neutral-700/70 transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-xs active:scale-[0.99]"
          >
            <Fingerprint className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Sign In with Face ID / Touch ID / Passkey</span>
          </button>

          {/* Security footnote */}
          <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-center gap-2 text-[11px] text-neutral-400 dark:text-neutral-500">
            <KeyRound className="w-3.5 h-3.5 text-emerald-500" />
            <span>Default demo credentials: <span className="font-mono text-neutral-600 dark:text-neutral-300">kashflow123</span></span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 dark:text-neutral-500 gap-3 border-t border-neutral-200/60 dark:border-neutral-800/60">
        <div>
          <span>© 2026 KashFlow Personal Budget Manager</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Encrypted local storage · Offline capable</span>
        </div>
      </footer>
    </div>
  );
};
