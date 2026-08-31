import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/+esm';

export const SUPABASE_URL = 'https://kqtbfeeqbcllwvlkbrkq.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
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

function workspacePeer() {
  if (window.opener && !window.opener.closed) return window.opener;
  if (window.parent && window.parent !== window) return window.parent;
  return null;
}

function workspaceTargetOrigins() {
  try {
    const referrerOrigin = document.referrer ? new URL(document.referrer).origin : '';
    if (WORKSPACE_ORIGINS.has(referrerOrigin)) return [referrerOrigin];
  } catch {
    // Fallback para os domínios explicitamente autorizados abaixo.
  }
  return Array.from(WORKSPACE_ORIGINS);
}

async function sessionFromWorkspace() {
  const peer = workspacePeer();
  if (!peer) return null;

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
      if (event.source !== peer) return;
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

    let sent = false;
    for (const origin of workspaceTargetOrigins()) {
      try {
        peer.postMessage({ type: 'CALI_MAPA_AUTH_REQUEST', href: window.location.href }, origin);
        sent = true;
      } catch {
        // Tenta o próximo domínio autorizado.
      }
    }
    if (!sent) finish(null);
  });
}

window.addEventListener('message', (event) => {
  if (!WORKSPACE_ORIGINS.has(event.origin)) return;
  const peer = workspacePeer();
  if (!peer || event.source !== peer) return;

  if (event.data?.type === 'CALI_MAPA_PRINT_REQUEST') {
    const printReport = window.imprimirRelatorio;
    if (typeof printReport === 'function') {
      Promise.resolve(printReport()).catch(() => window.print());
    } else {
      window.print();
    }
  }
});

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
