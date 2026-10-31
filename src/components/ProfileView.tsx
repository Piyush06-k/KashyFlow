import React, { useState, useRef } from 'react';
import {
  User,
  Mail,
  Lock,
  ShieldCheck,
  Fingerprint,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  DollarSign,
  Globe,
  Bell,
  Download,
  Trash2,
  Save,
  Clock,
  Sparkles,
  Phone,
  Briefcase,
  Eye,
  EyeOff,
  LogOut,
  RefreshCw,
  Sun,
  Moon,
} from 'lucide-react';
import { AuthUser, BudgetAppData } from '../types/budget';
import {
  updateUserProfile,
  updateUserPassword,
  AVATAR_PRESETS,
} from '../services/authService';
import { registerBiometricPasskey, isBiometricsAvailable } from '../services/biometricService';
import { resetVaultToEmpty, loadDemoSampleData } from '../services/storage';
import { SUPPORTED_CURRENCIES, formatMoney } from '../services/currencyService';

interface ProfileViewProps {
  currentUser: AuthUser;
  onUpdateUser: (updatedUser: AuthUser) => void;
  appData: BudgetAppData;
  onUpdateAppData: (updater: (prev: BudgetAppData) => BudgetAppData) => void;
  onLogout: () => void;
  onNotify: (title: string, message: string, type: 'sync' | 'alert' | 'info') => void;
  isDark?: boolean;
  onToggleDark?: () => void;
  onSetDark?: (val: boolean) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onUpdateUser,
  appData,
  onUpdateAppData,
  onLogout,
  onNotify,
  isDark = false,
  onToggleDark,
  onSetDark,
}) => {
  // Active Tab
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'data'>('profile');

  // Form State - Profile Details
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || '+1 (555) 234-8901');
  const [jobTitle, setJobTitle] = useState(currentUser.jobTitle || 'Vault Sovereign');
  const [role, setRole] = useState(currentUser.role || 'Vault Owner');
  const [avatar, setAvatar] = useState(currentUser.avatar || '');

  // Currency & Preferences
  const [currency, setCurrency] = useState(currentUser.currency || appData.currency || 'USD');
  const [timezone, setTimezone] = useState(currentUser.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [autoLockMinutes, setAutoLockMinutes] = useState(appData.autoLockMinutes || 15);
  const [biometricPin, setBiometricPin] = useState(appData.biometricPin || '1234');

  // Password Update State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordStatusMsg, setPasswordStatusMsg] = useState<{ text: string; error: boolean } | null>(null);

  // Profile Save State
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Biometrics State
  const [isRegisteringBio, setIsRegisteringBio] = useState(false);
  const [hasBiometricsHardware, setHasBiometricsHardware] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    isBiometricsAvailable().then(setHasBiometricsHardware);
  }, []);

  // Handle Photo Upload (Convert to Base64)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setProfileErrorMsg('Image size should be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setAvatar(result);
        setProfileSuccessMsg('Photo uploaded. Click "Save Profile Changes" to persist.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Save General Profile Info
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileErrorMsg('');
    setProfileSuccessMsg('');

    try {
      const updated = await updateUserProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        jobTitle: jobTitle.trim(),
        role: role.trim(),
        avatar: avatar,
        currency,
        timezone,
      });

      onUpdateUser(updated);
      setProfileSuccessMsg('Profile updated and synchronized successfully!');
      onNotify('Profile Updated', 'Your personal vault profile changes have been saved.', 'sync');
      setTimeout(() => setProfileSuccessMsg(''), 4000);
    } catch (err: any) {
      setProfileErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatusMsg(null);

    if (newPassword.length < 4) {
      setPasswordStatusMsg({ text: 'New password must be at least 4 characters long.', error: true });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatusMsg({ text: 'New password and confirmation do not match.', error: true });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updateUserPassword(currentPassword, newPassword);
      setPasswordStatusMsg({ text: 'Password successfully changed and encrypted in vault.', error: false });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onNotify('Security Alert', 'Vault account password was successfully updated.', 'info');
      setTimeout(() => setPasswordStatusMsg(null), 5000);
    } catch (err: any) {
      setPasswordStatusMsg({ text: err.message || 'Error updating password. Check current password.', error: true });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Save Quick Vault PIN & Lock Timeout
  const handleSaveSecurityPreferences = () => {
    onUpdateAppData((prev) => ({
      ...prev,
      biometricPin,
      autoLockMinutes,
      currency,
    }));
    onNotify('Security Preferences Updated', `PIN & Auto-lock timeout set to ${autoLockMinutes}m.`, 'sync');
    setProfileSuccessMsg('Security settings saved.');
    setTimeout(() => setProfileSuccessMsg(''), 3000);
  };

  // Register Hardware Passkey
  const handleEnrollBiometrics = async () => {
    setIsRegisteringBio(true);
    try {
      const ok = await registerBiometricPasskey();
      if (ok) {
        onNotify('Passkey Enrolled', 'Hardware biometric key successfully registered for this browser.', 'sync');
        await updateUserProfile({ biometricRegistered: true });
        onUpdateUser({ ...currentUser, biometricRegistered: true });
      } else {
        onNotify('Passkey Incomplete', 'Biometric enrollment was cancelled or not supported.', 'alert');
      }
    } finally {
      setIsRegisteringBio(false);
    }
  };

  // Export Vault Backup
  const handleExportBackup = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(appData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute(
      'download',
      `kashflow_vault_backup_${currentUser.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onNotify('Backup Exported', 'Full encrypted JSON ledger downloaded.', 'info');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Profile Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white p-6 sm:p-8 shadow-xl overflow-hidden">
        {/* Subtle decorative background circles */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 rounded-full bg-teal-400/10 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar with live photo edit button */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden ring-4 ring-white/30 shadow-2xl bg-emerald-900/60 flex items-center justify-center">
              {avatar ? (
                <img
                  src={avatar}
                  alt={currentUser.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <span className="text-3xl font-extrabold text-white">
                  {currentUser.name?.[0]?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              title="Upload new profile picture"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* User Details */}
          <div className="flex-1 text-center md:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white truncate">
                {name || 'Vault User'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-md border border-white/20">
                {role || 'Vault Owner'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-100 border border-emerald-300/30">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                Verified Ledger
              </span>
            </div>

            <p className="text-sm text-emerald-100/90 mb-3 flex items-center justify-center md:justify-start gap-2">
              <Mail className="w-3.5 h-3.5 opacity-80" />
              <span>{email}</span>
              <span>·</span>
              <Briefcase className="w-3.5 h-3.5 opacity-80" />
              <span>{jobTitle}</span>
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-emerald-100/70 pt-2 border-t border-white/10">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Last Login: {currentUser.lastLogin ? new Date(currentUser.lastLogin).toLocaleDateString() : 'Active now'}
              </span>
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                Currency: <strong className="text-white font-mono">{currency}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5" />
                Biometrics: {hasBiometricsHardware ? 'Supported' : 'PIN Protected'}
              </span>
            </div>
          </div>

          {/* Quick Header Action */}
          <div className="shrink-0 flex md:flex-col gap-2">
            <button
              type="button"
              onClick={handleExportBackup}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/25 active:bg-white/30 text-white backdrop-blur-md border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Vault</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 active:bg-rose-500/40 text-rose-100 border border-rose-300/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800 text-sm font-medium gap-2 sm:gap-6 overflow-x-auto no-scrollbar">
        {[
          { id: 'profile', label: 'Personal Information', icon: User },
          { id: 'security', label: 'Security & Password', icon: Lock },
          { id: 'preferences', label: 'Preferences & Regional', icon: Globe },
          { id: 'data', label: 'Vault Data & Sessions', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-3 border-b-2 font-semibold text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-emerald-600 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Global Alerts for Profile */}
      {profileSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{profileSuccessMsg}</span>
        </div>
      )}
      {profileErrorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{profileErrorMsg}</span>
        </div>
      )}

      {/* 3. Tab Contents */}

      {/* TAB 1: Personal Information */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Avatar Chooser & Preset Gallery */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-neutral-950 dark:text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Profile Picture
            </h3>

            {/* Current preview */}
            <div className="flex flex-col items-center p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/60">
              <div className="w-24 h-24 rounded-2xl overflow-hidden ring-2 ring-emerald-500/30 mb-3 bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                {avatar ? (
                  <img src={avatar} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-neutral-500">
                    {name?.[0]?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Image</span>
                </button>
                {avatar && (
                  <button
                    type="button"
                    onClick={() => setAvatar('')}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-all cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 mt-2 text-center">
                PNG, JPG or WebP (max 2MB)
              </p>
            </div>

            {/* Presets Gallery */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
                Or Select from Curated Avatars
              </label>
              <div className="grid grid-cols-4 gap-2">
                {AVATAR_PRESETS.map((preset) => {
                  const isSelected = avatar === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setAvatar(preset.url)}
                      title={preset.label}
                      className={`relative aspect-square rounded-xl overflow-hidden ring-2 transition-all cursor-pointer hover:scale-105 ${
                        isSelected
                          ? 'ring-emerald-500 scale-105'
                          : 'ring-transparent hover:ring-neutral-300 dark:hover:ring-neutral-700'
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-emerald-600/30 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-white drop-shadow" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="lg:col-span-2 bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <h3 className="text-base font-bold text-neutral-950 dark:text-white mb-1">
              Personal Information
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
              Update your name, registered email, and contact details for transaction alerts.
            </p>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Full Legal Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Morgan"
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex.morgan@kashflow.io"
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Phone Number (Security Alerts)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 234-8901"
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Vault Role / Profile Title
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. Lead Wealth Manager"
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Account Type / Permission Tier
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Vault Owner">Vault Owner (Full Admin & Encryption Authority)</option>
                  <option value="Personal Account">Personal Account (Standard Budget & Banking)</option>
                  <option value="Household Manager">Household Manager (Shared Ledger)</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-60"
                >
                  {isSavingProfile ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save Profile Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: Security & Password */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Change Password Card */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <h3 className="text-base font-bold text-neutral-950 dark:text-white mb-1 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Change Vault Password
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
              Create a strong master password for your encrypted local vault.
            </p>

            {passwordStatusMsg && (
              <div
                className={`mb-4 p-3 rounded-xl border flex items-start gap-2 text-xs ${
                  passwordStatusMsg.error
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300'
                }`}
              >
                {passwordStatusMsg.error ? (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{passwordStatusMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {/* Strength Meter */}
                {newPassword && (
                  <div className="mt-2">
                    <div className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          newPassword.length < 6
                            ? 'w-1/3 bg-rose-500'
                            : newPassword.length < 10
                            ? 'w-2/3 bg-amber-500'
                            : 'w-full bg-emerald-500'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] text-neutral-400 mt-1 block">
                      Strength:{' '}
                      {newPassword.length < 6 ? 'Weak' : newPassword.length < 10 ? 'Good' : 'Strong'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-60"
              >
                {isUpdatingPassword ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Update Password</span>
              </button>
            </form>
          </div>

          {/* Biometrics & Fast Hardware Passkeys */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-neutral-950 dark:text-white flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Hardware Biometric Passkeys
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  {hasBiometricsHardware ? 'Sensor Ready' : 'WebAuthn'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                Enroll Touch ID, Face ID, or Windows Hello for instant, 1-tap browser authentication.
              </p>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700/60 mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                    Platform Authenticator
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    FIDO2 / WebAuthn passkey binding for this device
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleEnrollBiometrics}
                  disabled={isRegisteringBio}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>{isRegisteringBio ? 'Enrolling...' : 'Enroll Passkey'}</span>
                </button>
              </div>

              {/* Fast Vault Unlock PIN */}
              <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Vault Screen Quick PIN (4 Digits)
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    maxLength={6}
                    value={biometricPin}
                    onChange={(e) => setBiometricPin(e.target.value.replace(/\D/g, ''))}
                    className="w-32 px-3 py-2 text-center text-sm font-mono tracking-widest rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveSecurityPreferences}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
                  >
                    Save PIN
                  </button>
                </div>
                <span className="text-[11px] text-neutral-400 mt-1 block">
                  Used to unlock your session when the screen locks.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Preferences & Regional */}
      {activeTab === 'preferences' && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm max-w-3xl">
          <h3 className="text-base font-bold text-neutral-950 dark:text-white mb-1 flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Regional & Budget Preferences
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
            Configure currency formatting, automatic lock intervals, and monthly calendar cycles.
          </p>

          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Base Display Currency (Country & Currency)
                </label>
                <select
                  value={currency}
                  onChange={(e) => {
                    const newCurr = e.target.value;
                    setCurrency(newCurr);
                    onUpdateAppData((prev) => ({
                      ...prev,
                      currency: newCurr,
                    }));
                    updateUserProfile({ currency: newCurr }).then((u) => {
                      if (u) onUpdateUser(u);
                    });
                    onNotify('Currency Updated', `Default application currency set to ${newCurr}.`, 'sync');
                  }}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  {SUPPORTED_CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.flag} {curr.code} ({curr.symbol}) — {curr.name} ({curr.country})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-neutral-400 mt-1 block">
                  Converts every financial section, ledger entry, and forecast across the app.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Local Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                >
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  <option value="America/Chicago">America/Chicago (CST)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Europe/Paris">Europe/Paris (CET)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Inactivity Auto-Lock Timeout
                </label>
                <select
                  value={autoLockMinutes}
                  onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={5}>After 5 minutes of inactivity</option>
                  <option value={15}>After 15 minutes of inactivity</option>
                  <option value={30}>After 30 minutes of inactivity</option>
                  <option value={60}>After 1 hour of inactivity</option>
                  <option value={0}>Never lock automatically</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Monthly Cycle Starting Day
                </label>
                <select
                  defaultValue={1}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={1}>1st of each calendar month</option>
                  <option value={15}>15th of each month (Mid-month cycle)</option>
                  <option value={25}>25th of each month (Salary cycle)</option>
                </select>
              </div>
            </div>

            {/* Interface Theme Mode Switcher */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Interface Color Theme
              </label>
              <div className="grid grid-cols-2 gap-3 max-w-sm">
                <button
                  type="button"
                  onClick={() => {
                    if (isDark && onSetDark) onSetDark(false);
                    else if (isDark && onToggleDark) onToggleDark();
                    onNotify('Theme Updated', 'Switched to Light Mode.', 'info');
                  }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    !isDark
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600'
                  }`}
                >
                  <Sun className={`w-4 h-4 ${!isDark ? 'text-emerald-600' : 'text-neutral-400'}`} />
                  <span>Light Mode</span>
                  {!isDark && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-auto" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!isDark && onSetDark) onSetDark(true);
                    else if (!isDark && onToggleDark) onToggleDark();
                    onNotify('Theme Updated', 'Switched to Dark Mode.', 'info');
                  }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isDark
                      ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600'
                  }`}
                >
                  <Moon className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-neutral-400'}`} />
                  <span>Dark Mode</span>
                  {isDark && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-auto" />}
                </button>
              </div>
              <span className="text-[11px] text-neutral-400 mt-1.5 block">
                Choose between clean light mode and dark mode.
              </span>
            </div>

            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
              <button
                type="button"
                onClick={handleSaveSecurityPreferences}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>Save Preferences</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Vault Data & Sessions */}
      {activeTab === 'data' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-neutral-950 dark:text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Encrypted Vault Export & Backup
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Download your full local financial records, categorized transactions, and bank tokens as an encrypted JSON ledger.
            </p>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">Total Transactions:</span>
                <span className="font-semibold text-neutral-900 dark:text-white">{appData.transactions.length} entries</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">Connected Accounts:</span>
                <span className="font-semibold text-neutral-900 dark:text-white">{appData.accounts.length} institutions</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">Monthly Budget Total:</span>
                <span className="font-semibold text-neutral-900 dark:text-white">{formatMoney(appData.monthlyBudgetTotal, appData.currency || 'INR')}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportBackup}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Encrypted JSON Vault</span>
            </button>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-rose-200 dark:border-rose-900/40 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Danger Zone & Active Session
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Manage your local storage cache, sign out of this browser, or reset test data.
            </p>

            <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 space-y-3">
              <div>
                <p className="text-xs font-semibold text-rose-900 dark:text-rose-300">
                  Reset to Fresh Empty Ledger
                </p>
                <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80">
                  Clears all current transactions, balances, and bills so you can start completely clean from zero.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Reset your ledger to a completely empty state? All current entries will be cleared.')) {
                    const empty = resetVaultToEmpty();
                    onUpdateAppData(() => empty);
                    onNotify('Ledger Reset', 'Your financial records have been reset to a fresh empty state.', 'sync');
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset to Blank Ledger</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-100/60 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700/60 space-y-3">
              <div>
                <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                  Load Sample Preview Data (Optional)
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Want to test the machine learning charts with sample numbers? Load demo accounts and sample expenses.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const sample = loadDemoSampleData();
                  onUpdateAppData(() => sample);
                  onNotify('Sample Data Loaded', 'Sample transactions and accounts loaded for preview.', 'info');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Load Sample Template Data</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-200/60 dark:border-neutral-800 space-y-3">
              <div>
                <p className="text-xs font-semibold text-neutral-900 dark:text-white">
                  Log Out of Current Session
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Terminates the active session token and returns to the login screen.
                </p>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-all flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out of Vault</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
