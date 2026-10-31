import { AuthUser } from '../types/budget';
import { authenticateWithBiometrics } from './biometricService';

const SESSION_STORAGE_KEY = 'kashflow_auth_session';
const REGISTERED_LOCAL_USERS_KEY = 'kashflow_local_users';

export interface DemoAccount {
  name: string;
  email: string;
  role: string;
  tag: string;
  avatar: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    name: 'Alex Morgan',
    email: 'alex.morgan@kashflow.io',
    role: 'Vault Owner',
    tag: 'Primary Budget & Investments',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&h=160&q=80',
  },
  {
    name: 'Jordan Lee',
    email: 'demo@kashflow.io',
    role: 'Personal Account',
    tag: 'Shared Household & Bills',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&h=160&q=80',
  },
];

export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveUserSession(user: AuthUser, rememberMe = true) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  } catch (err) {
    console.warn('Failed to save session:', err);
  }
}

export function clearUserSession() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {}
}

export async function loginWithEmail(
  email: string,
  password: string,
  rememberMe = true
): Promise<AuthUser> {
  const normalizedEmail = email.trim().toLowerCase();

  // Try server endpoint first
  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, password }),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.success && data.user) {
        saveUserSession(data.user, rememberMe);
        return data.user;
      }
    } else {
      const errData = await resp.json().catch(() => ({}));
      if (errData.message) {
        throw new Error(errData.message);
      }
    }
  } catch (err: any) {
    // If it was an actual 401 error message from backend, rethrow
    if (err.message && !err.message.includes('fetch')) {
      throw err;
    }
    // Otherwise fallback to local offline mode
    console.warn('Server offline, checking local auth fallback');
  }

  // Local fallback (offline or demo accounts)
  const demoMatch = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === normalizedEmail);
  if (demoMatch || normalizedEmail === 'demo@kashflow.io' || normalizedEmail === 'alex.morgan@kashflow.io') {
    const user: AuthUser = {
      id: demoMatch?.email === 'demo@kashflow.io' ? 'usr_demo_02' : 'usr_owner_01',
      name: demoMatch?.name || 'Alex Morgan',
      email: demoMatch?.email || normalizedEmail,
      role: demoMatch?.role || 'Vault Owner',
      avatar: demoMatch?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&h=160&q=80',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      token: `local_token_${Date.now()}`,
      lastLogin: new Date().toISOString(),
    };
    saveUserSession(user, rememberMe);
    return user;
  }

  // Check locally registered users in browser
  try {
    const rawLocal = localStorage.getItem(REGISTERED_LOCAL_USERS_KEY);
    if (rawLocal) {
      const localUsers = JSON.parse(rawLocal);
      const found = localUsers.find(
        (u: any) => u.email.toLowerCase() === normalizedEmail && u.password === password
      );
      if (found) {
        const user: AuthUser = {
          id: found.id,
          name: found.name,
          email: found.email,
          role: found.role || 'Vault Owner',
          avatar: found.avatar,
          currency: found.currency || 'INR',
          timezone: found.timezone || 'Asia/Kolkata',
          token: `local_token_${Date.now()}`,
          lastLogin: new Date().toISOString(),
        };
        saveUserSession(user, rememberMe);
        return user;
      }
    }
  } catch {}

  throw new Error('Invalid email or password. You can also click Quick Demo Login below.');
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
  rememberMe = true
): Promise<AuthUser> {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const resp = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: normalizedEmail, password }),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.success && data.user) {
        saveUserSession(data.user, rememberMe);
        return data.user;
      }
    } else {
      const errData = await resp.json().catch(() => ({}));
      if (errData.message) {
        throw new Error(errData.message);
      }
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) {
      throw err;
    }
  }

  // Local fallback registration
  const newUser = {
    id: `usr_local_${Date.now()}`,
    name: name.trim() || 'Vault User',
    email: normalizedEmail,
    password: password,
    role: 'Vault Owner',
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'User')}`,
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    token: `local_token_${Date.now()}`,
    lastLogin: new Date().toISOString(),
  };

  try {
    const existingRaw = localStorage.getItem(REGISTERED_LOCAL_USERS_KEY);
    const existing = existingRaw ? JSON.parse(existingRaw) : [];
    existing.push(newUser);
    localStorage.setItem(REGISTERED_LOCAL_USERS_KEY, JSON.stringify(existing));
  } catch {}

  const authUser: AuthUser = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    avatar: newUser.avatar,
    currency: newUser.currency,
    timezone: newUser.timezone,
    token: newUser.token,
    lastLogin: newUser.lastLogin,
  };

  saveUserSession(authUser, rememberMe);
  return authUser;
}

export async function loginWithBiometrics(): Promise<AuthUser> {
  const verified = await authenticateWithBiometrics();
  if (!verified) {
    throw new Error('Biometric verification cancelled or failed.');
  }

  // Load existing session or default to Alex Morgan
  const existing = getCurrentUser();
  const user: AuthUser = existing || {
    id: 'usr_owner_01',
    name: 'Alex Morgan',
    email: 'alex.morgan@kashflow.io',
    role: 'Vault Owner',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&h=160&q=80',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    token: `bio_token_${Date.now()}`,
    lastLogin: new Date().toISOString(),
  };

  saveUserSession(user, true);
  return user;
}

export const AVATAR_PRESETS = [
  { id: 'av1', label: 'Executive Woman', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80' },
  { id: 'av2', label: 'Tech Professional', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80' },
  { id: 'av3', label: 'Modern Creative', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&h=256&q=80' },
  { id: 'av4', label: 'Financial Analyst', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80' },
  { id: 'av5', label: 'Design Director', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&h=256&q=80' },
  { id: 'av6', label: 'Portfolio Manager', url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=256&h=256&q=80' },
  { id: 'av7', label: 'Minimalist Vector', url: 'https://api.dicebear.com/7.x/identicon/svg?seed=kashflow_emerald' },
  { id: 'av8', label: 'Vault Sovereign', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=vault_investor' },
];

export async function updateUserProfile(updates: Partial<AuthUser>): Promise<AuthUser> {
  const current = getCurrentUser();
  if (!current) throw new Error('No active user session');

  const mergedUser: AuthUser = {
    ...current,
    ...updates,
  };

  // 1. Try to update backend if available
  try {
    const resp = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mergedUser),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.success && data.user) {
        saveUserSession(data.user);
        return data.user;
      }
    }
  } catch (e) {
    console.warn('Backend profile update failed or offline, updating local session:', e);
  }

  // 2. Local fallback
  saveUserSession(mergedUser);

  // Update in local registered users if exists
  try {
    const rawLocal = localStorage.getItem(REGISTERED_LOCAL_USERS_KEY);
    if (rawLocal) {
      const localUsers = JSON.parse(rawLocal);
      const idx = localUsers.findIndex((u: any) => u.id === mergedUser.id || u.email === mergedUser.email);
      if (idx !== -1) {
        localUsers[idx] = { ...localUsers[idx], ...updates };
        localStorage.setItem(REGISTERED_LOCAL_USERS_KEY, JSON.stringify(localUsers));
      }
    }
  } catch {}

  return mergedUser;
}

export async function updateUserPassword(currentPassword: string, newPassword: string): Promise<boolean> {
  const current = getCurrentUser();
  if (!current) throw new Error('No active user session');

  try {
    const resp = await fetch('/api/auth/change-password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: current.id,
        email: current.email,
        currentPassword,
        newPassword,
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      return data.success;
    } else {
      const err = await resp.json().catch(() => ({}));
      if (err.message) throw new Error(err.message);
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch')) throw err;
  }

  // Local fallback
  try {
    const rawLocal = localStorage.getItem(REGISTERED_LOCAL_USERS_KEY);
    if (rawLocal) {
      const localUsers = JSON.parse(rawLocal);
      const user = localUsers.find((u: any) => u.id === current.id || u.email === current.email);
      if (user) {
        user.password = newPassword;
        localStorage.setItem(REGISTERED_LOCAL_USERS_KEY, JSON.stringify(localUsers));
        return true;
      }
    }
  } catch {}

  return true;
}

