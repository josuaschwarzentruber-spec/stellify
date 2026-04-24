import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Edge's Bounce Tracking Mitigation can delete localStorage for sites in
// a redirect chain. Writing to both storages ensures the PKCE code_verifier
// survives: if localStorage is cleared, sessionStorage still has it.
const dualStorage = {
  getItem: (key: string): string | null => {
    try { const v = localStorage.getItem(key); if (v !== null) return v; } catch (_) {}
    try { return sessionStorage.getItem(key); } catch (_) {}
    return null;
  },
  setItem: (key: string, value: string): void => {
    try { localStorage.setItem(key, value); } catch (_) {}
    try { sessionStorage.setItem(key, value); } catch (_) {}
  },
  removeItem: (key: string): void => {
    try { localStorage.removeItem(key); } catch (_) {}
    try { sessionStorage.removeItem(key); } catch (_) {}
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: dualStorage,
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
    flowType: 'pkce',
  },
});
