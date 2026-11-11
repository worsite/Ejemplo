import test from 'node:test';
import assert from 'node:assert/strict';
import { createSupabase } from '../supabase.js';
import { esc } from '../util.js';

const URL_ = 'https://x.supabase.co';
const KEY = 'anon-key';
const reply = (status, body) => ({ ok: status < 400, status, text: async () => (body === undefined ? '' : JSON.stringify(body)) });
function setup(handler) {
  const calls = [];
  const fetch = async (url, init) => { calls.push({ url, init }); return handler(url, init, calls.length); };
  const sb = createSupabase({ url: URL_, key: KEY, fetch });
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

test('esc neutraliza HTML', () => {
  assert.equal(esc('<img src=x onerror="a()">&\'' ), '&lt;img src=x onerror=&quot;a()&quot;&gt;&amp;&#39;');
});
