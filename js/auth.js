// ============================================================
// Shield Inspection Services — Authentication (Supabase)
// ============================================================

import { createClient } from '@supabase/supabase-js';

// Default to empty strings — set via Settings page or env
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase = null;

function getClient() {
  if (supabase) return supabase;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'shield-auth'
    }
  });
  return supabase;
}

/**
 * Sign in with email and password
 */
export async function signIn(email, password) {
  const client = getClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/**
 * Sign out
 */
export async function signOut() {
  const client = getClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

/**
 * Get the current session (works offline via localStorage)
 */
export async function getSession() {
  try {
    const client = getClient();
    const { data: { session } } = await client.auth.getSession();
    return session;
  } catch (e) {
    // If Supabase isn't configured or offline, check localStorage fallback
    const stored = localStorage.getItem('shield-auth');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Check if token hasn't expired (with 24h grace for offline)
        if (parsed.expires_at && parsed.expires_at * 1000 > Date.now() - 86400000) {
          return parsed;
        }
      } catch { /* ignore parse errors */ }
    }
    return null;
  }
}

/**
 * Get the current user
 */
export async function getUser() {
  const session = await getSession();
  return session?.user || null;
}

/**
 * Listen for auth state changes
 */
export function onAuthChange(callback) {
  try {
    const client = getClient();
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return subscription;
  } catch {
    return null;
  }
}

/**
 * Check if Supabase is configured
 */
export function isAuthConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
