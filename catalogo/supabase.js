// Cliente mínimo de Supabase sobre fetch (PostgREST + Auth). Sin dependencias.
const SESSION_KEY = 'burgerfest-admin-session-v1';
const MARGIN_S = 60;

export function createSupabase({ url, key, fetch: fetchFn = (...a) => globalThis.fetch(...a), now = Date.now, storage = null }) {
  let session = null;
  try { session = JSON.parse(storage?.getItem(SESSION_KEY) || 'null'); } catch { session = null; }

  const persist = () => {
    try { session ? storage?.setItem(SESSION_KEY, JSON.stringify(session)) : storage?.removeItem(SESSION_KEY); } catch { /* sin storage */ }
  };

  async function raw(path, { method = 'GET', body, headers = {}, token = key } = {}) {
    const res = await fetchFn(url + path, {
      method,
      headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let data = null;
    if (text) { try { data = JSON.parse(text); } catch { data = text; } }
    if (!res.ok) {
      const msg = (data && (data.message || data.error_description || data.msg || data.error)) || `Error ${res.status}`;
      throw Object.assign(new Error(msg), { status: res.status });
    }
    return data;
  }

  const toSession = (d) => ({
    access_token: d.access_token, refresh_token: d.refresh_token, user: d.user,
    expires_at: Math.floor(now() / 1000) + (d.expires_in || 3600),
  });

  async function refresh() {
    try {
      session = toSession(await raw('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refresh_token } }));
      persist();
    } catch (e) { session = null; persist(); throw e; }
  }

  async function authed(path, opts) {
    if (session && session.expires_at - now() / 1000 < MARGIN_S) await refresh();
    return raw(path, { ...opts, token: session ? session.access_token : key });
  }

  return {
    getSession: () => session,
    async signIn(email, password) {
      try {
        session = toSession(await raw('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } }));
      } catch (e) {
        if (e.status === 400) throw Object.assign(new Error('El correo o la contraseña no son correctos.'), { status: 400 });
        throw e;
      }
      persist();
      return session;
    },
    signOut() { session = null; persist(); },
    rpc: (name, args) => authed(`/rest/v1/rpc/${name}`, { method: 'POST', body: args }),
    select: (table, query) => authed(`/rest/v1/${table}?${query}`),
    update: (table, filter, patch) => authed(`/rest/v1/${table}?${filter}`, { method: 'PATCH', body: patch, headers: { Prefer: 'return=representation' } }),
  };
}
