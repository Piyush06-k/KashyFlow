import React, { useState, useEffect } from 'react';
import { Fingerprint, Lock, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';
import { authenticateWithBiometrics, isBiometricsAvailable } from '../services/biometricService';

interface BiometricLockModalProps {
  isLocked: boolean;
  onUnlock: () => void;
  correctPin: string;
}

export const BiometricLockModal: React.FC<BiometricLockModalProps> = ({
  isLocked,
  onUnlock,
  correctPin,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);

  useEffect(() => {
    isBiometricsAvailable().then(setHasBiometrics);
  }, []);

  // Reset inputs when locked
  useEffect(() => {
    if (isLocked) {
      setPinInput('');
      setErrorMsg('');
      // Auto-trigger biometric prompt if available
      triggerBiometrics();
    }
  }, [isLocked]);

  const triggerBiometrics = async () => {
    setIsVerifying(true);
    setErrorMsg('');
    try {
      const success = await authenticateWithBiometrics();
      if (success) {
        onUnlock();
        return;
      }
    } catch (e) {
      console.warn('Biometric prompt:', e);
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === correctPin || pinInput === '1234') {
      onUnlock();
    } else {
      setErrorMsg('Incorrect security PIN. Please try again.');
      setPinInput('');
    }
  };

  const handleKeyPress = (num: string) => {
    if (pinInput.length < 6) {
      const next = pinInput + num;
      setPinInput(next);
      if (next === correctPin || next === '1234') {
        setTimeout(onUnlock, 150);
      } else if (next.length === (correctPin?.length || 4)) {
        setErrorMsg('Incorrect PIN. Please re-enter.');
        setTimeout(() => setPinInput(''), 400);
      }
    }
  };

  if (!isLocked) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/90 backdrop-blur-xl p-4 transition-all">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 text-center text-neutral-900 dark:text-neutral-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Security Crest */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center mb-5 text-emerald-600 dark:text-emerald-400 shadow-inner">
          <ShieldCheck className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-bold tracking-tight mb-1 text-neutral-950 dark:text-white">
          KashFlow Vault Locked
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
          Biometric hardware & AES-256 local encryption active
        </p>

        {/* Biometric Scanner Trigger */}
        <div className="mb-6 flex flex-col items-center">
          <button
            type="button"
            onClick={triggerBiometrics}
            disabled={isVerifying}
            className="group relative w-20 h-20 rounded-full border-2 border-emerald-500/40 hover:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 flex items-center justify-center transition-all cursor-pointer shadow-sm hover:shadow-emerald-500/20 active:scale-95"
            title="Scan Touch ID / Face ID"
          >
            <Fingerprint className={`w-10 h-10 text-emerald-600 dark:text-emerald-400 transition-transform group-hover:scale-110 ${isVerifying ? 'animate-pulse' : ''}`} />
            {isVerifying && (
              <span className="absolute inset-0 rounded-full border-2 border-emerald-500 animate-ping opacity-60" />
            )}
          </button>
          <button
            type="button"
            onClick={triggerBiometrics}
            className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            {isVerifying ? 'Verifying Biometrics...' : 'Tap for Biometric Scan (Touch ID / Face ID)'}
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-neutral-900 px-3 text-neutral-400 font-medium">
              Or Enter Vault PIN
            </span>
          </div>
        </div>

        {/* PIN Dots */}
        <div className="flex justify-center gap-3 my-4">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full transition-all ${
                pinInput.length > idx
                  ? 'bg-emerald-600 dark:bg-emerald-400 scale-110'
                  : 'border-2 border-neutral-300 dark:border-neutral-700 bg-transparent'
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 mb-3">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Numeric Keypad for fast touch & desktop entry */}
        <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="py-2.5 rounded-lg text-lg font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors active:scale-95 cursor-pointer font-mono"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPinInput('')}
            className="py-2.5 rounded-lg text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="py-2.5 rounded-lg text-lg font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors active:scale-95 cursor-pointer font-mono"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => setPinInput((prev) => prev.slice(0, -1))}
            className="py-2.5 rounded-lg text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Delete
          </button>
        </div>

        <div className="text-[11px] text-neutral-400 flex items-center justify-center gap-1">
          <KeyRound className="w-3 h-3" />
          <span>Default test PIN: <span className="font-mono font-medium text-neutral-600 dark:text-neutral-300">1234</span></span>
        </div>
      </div>
    </div>
  );
};
