import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/+esm';

export const SUPABASE_URL = 'https://kqtbfeeqbcllwvlkbrkq.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxdGJmZWVxYmNsbHd2bGticmtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5OTIyODMsImV4cCI6MjEwMjU2ODI4M30.G8xr2MR_YWKWjzSk88r9ryVzCyR9QqQEWHrHNeWE7Cg';
export const ADMIN_EMAIL = 'patricia@calirh.com';
const WORKSPACE_ORIGINS = new Set([
  'https://app.calirh.com',
  'http://localhost:5173',
  'http://localhost:4173'
]);

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

async function sessionFromWorkspace() {
  if (!window.opener || window.opener.closed) return null;
  return await new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      clearTimeout(timeout);
      resolve(value);
    };
    const onMessage = async (event) => {
      if (!WORKSPACE_ORIGINS.has(event.origin)) return;
      if (event.source !== window.opener) return;
      if (event.data?.type !== 'CALI_MAPA_AUTH_RESPONSE') return;
      const accessToken = String(event.data?.access_token || '');
      if (!accessToken) return finish(null);
      try {
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);
        if (error || !isAdmin(user)) return finish(null);
        finish({ access_token: accessToken, user, bridged_from_workspace: true });
      } catch {
        finish(null);
      }
    };
    const timeout = setTimeout(() => finish(null), 4500);
    window.addEventListener('message', onMessage);
    try {
      window.opener.postMessage({ type: 'CALI_MAPA_AUTH_REQUEST', href: window.location.href }, 'https://app.calirh.com');
    } catch {
      finish(null);
    }
  });
}

export async function requireAdmin() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (!error && session && isAdmin(session.user)) return session;

  const bridged = await sessionFromWorkspace();
  if (bridged) return bridged;

  if (session && !isAdmin(session.user)) await supabase.auth.signOut();
  const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
  window.location.replace(`login.html?next=${next}`);
  return null;
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
