import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/+esm';

export const SUPABASE_URL = 'https://kqtbfeeqbcllwvlkbrkq.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxdGJmZWVxYmNsbHd2bGticmtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5OTIyODMsImV4cCI6MjEwMjU2ODI4M30.G8xr2MR_YWKWjzSk88r9ryVzCyR9QqQEWHrHNeWE7Cg';
export const ADMIN_EMAIL = 'patricia@calirh.com';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit'
  }
});

export function isAdmin(user) {
  return Boolean(user?.email && user.email.toLowerCase() === ADMIN_EMAIL);
}

export function safeNext(value, fallback = 'painel.html') {
  if (!value) return fallback;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    return `${url.pathname.replace(/^\//, '')}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}

export async function requireAdmin() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
    window.location.replace(`login.html?next=${next}`);
    return null;
  }

  if (!isAdmin(session.user)) {
    await supabase.auth.signOut();
    window.location.replace('login.html?erro=sem-acesso');
    return null;
  }

  return session;
}

export function apiHeaders(session, extra = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.replace('login.html');
}
