// Cliente mínimo de Supabase: solo llamadas a funciones (RPC) con la clave pública "anon".
export function createSupabase({ url, key, fetch: fetchFn = (...a) => globalThis.fetch(...a) }) {
  return {
    async rpc(name, args) {
      const res = await fetchFn(`${url}/rest/v1/rpc/${name}`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(args ?? {}),
      });
      const text = await res.text();
      let data = null;
      if (text) { try { data = JSON.parse(text); } catch { data = text; } }
      if (!res.ok) {
        const msg = (data && (data.message || data.error_description || data.msg || data.error)) || `Error ${res.status}`;
        throw Object.assign(new Error(msg), { status: res.status });
      }
      return data;
    },
  };
}
