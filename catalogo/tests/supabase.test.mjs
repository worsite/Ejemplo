import test from 'node:test';
import assert from 'node:assert/strict';
import { createSupabase } from '../supabase.js';
import { esc } from '../util.js';

const URL_ = 'https://x.supabase.co';
const KEY = 'anon-key';
const reply = (status, body) => ({ ok: status < 400, status, text: async () => (body === undefined ? '' : JSON.stringify(body)) });
function setup(handler, extra = {}) {
  const calls = [];
  const fetch = async (url, init) => { calls.push({ url, init }); return handler(url, init, calls.length); };
  const sb = createSupabase({ url: URL_, key: KEY, fetch, now: () => 1_000_000_000, ...extra });
  return { sb, calls };
}

test('rpc hace POST con clave anon y devuelve el JSON', async () => {
  const { sb, calls } = setup(() => reply(200, { id: 'u1', code: 7 }));
  const out = await sb.rpc('create_order', { p_name: 'Ana' });
  assert.deepEqual(out, { id: 'u1', code: 7 });
  assert.equal(calls[0].url, `${URL_}/rest/v1/rpc/create_order`);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.apikey, KEY);
  assert.equal(calls[0].init.headers.Authorization, `Bearer ${KEY}`);
  assert.deepEqual(JSON.parse(calls[0].init.body), { p_name: 'Ana' });
});

test('los errores de la API se lanzan con mensaje legible y status', async () => {
  const { sb } = setup(() => reply(400, { message: 'check constraint violated' }));
  await assert.rejects(sb.rpc('create_order', {}), (e) => e.status === 400 && /check constraint/.test(e.message));
});

test('un fallo de red se lanza como error', async () => {
  const sb = createSupabase({ url: URL_, key: KEY, fetch: async () => { throw new TypeError('Failed to fetch'); } });
  await assert.rejects(sb.rpc('x', {}), /fetch/i);
});

test('respuesta vacía devuelve null', async () => {
  const { sb } = setup(() => reply(200));
  assert.equal(await sb.rpc('get_order_status', { p_id: 'u' }), null);
});

test('signIn guarda la sesión y select usa el token del usuario', async () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  const { sb, calls } = setup((url) => url.includes('/auth/v1/token')
    ? reply(200, { access_token: 'tok1', refresh_token: 'ref1', expires_in: 3600, user: { id: 'U', email: 'a@b.co' } })
    : reply(200, [{ id: 1 }]), { storage });
  await sb.signIn('a@b.co', 'secreto');
  assert.equal(calls[0].url, `${URL_}/auth/v1/token?grant_type=password`);
  assert.deepEqual(JSON.parse(calls[0].init.body), { email: 'a@b.co', password: 'secreto' });
  const rows = await sb.select('orders', 'select=*&order=created_at.desc');
  assert.deepEqual(rows, [{ id: 1 }]);
  assert.equal(calls[1].url, `${URL_}/rest/v1/orders?select=*&order=created_at.desc`);
  assert.equal(calls[1].init.headers.Authorization, 'Bearer tok1');
  assert.equal(sb.getSession().user.email, 'a@b.co');
  // una instancia nueva recupera la sesión guardada
  const sb2 = createSupabase({ url: URL_, key: KEY, fetch: async () => reply(200, []), storage });
  assert.equal(sb2.getSession().access_token, 'tok1');
});

test('un token vencido se renueva antes de la consulta', async () => {
  const { sb, calls } = setup((url) => {
    if (url.includes('grant_type=password')) return reply(200, { access_token: 'viejo', refresh_token: 'r1', expires_in: 30, user: { id: 'U' } });
    if (url.includes('grant_type=refresh_token')) return reply(200, { access_token: 'nuevo', refresh_token: 'r2', expires_in: 3600, user: { id: 'U' } });
    return reply(200, []);
  });
  await sb.signIn('a@b.co', 'x');          // vence en 30 s (< 60 s de margen)
  await sb.select('orders', 'select=*');
  assert.match(calls[1].url, /grant_type=refresh_token/);
  assert.deepEqual(JSON.parse(calls[1].init.body), { refresh_token: 'r1' });
  assert.equal(calls[2].init.headers.Authorization, 'Bearer nuevo');
});

test('si la renovación falla se cierra la sesión', async () => {
  const { sb } = setup((url) => {
    if (url.includes('grant_type=password')) return reply(200, { access_token: 'a', refresh_token: 'r', expires_in: 10, user: {} });
    return reply(400, { error_description: 'Invalid Refresh Token' });
  });
  await sb.signIn('a@b.co', 'x');
  await assert.rejects(sb.select('orders', 'select=*'), (e) => e.status === 400);
  assert.equal(sb.getSession(), null);
});

test('update hace PATCH con filtro y pide la fila de vuelta', async () => {
  const { sb, calls } = setup(() => reply(200, [{ id: 'u1', status: 'confirmado' }]));
  const rows = await sb.update('orders', 'id=eq.u1', { status: 'confirmado' });
  assert.equal(calls[0].init.method, 'PATCH');
  assert.equal(calls[0].url, `${URL_}/rest/v1/orders?id=eq.u1`);
  assert.equal(calls[0].init.headers.Prefer, 'return=representation');
  assert.deepEqual(rows, [{ id: 'u1', status: 'confirmado' }]);
});

test('signIn con credenciales malas lanza error en español', async () => {
  const { sb } = setup(() => reply(400, { error_description: 'Invalid login credentials' }));
  await assert.rejects(sb.signIn('a@b.co', 'mal'), /correo o la contraseña/i);
});

test('esc neutraliza HTML', () => {
  assert.equal(esc('<img src=x onerror="a()">&\'' ), '&lt;img src=x onerror=&quot;a()&quot;&gt;&amp;&#39;');
});
