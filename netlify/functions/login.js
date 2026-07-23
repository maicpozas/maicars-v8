import { neon } from '@netlify/neon';
import { createSessionCookie, verifyPassword } from './lib/auth.js';

export default async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { password } = await req.json();
    if (!password) return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    const sql = neon();
    await sql`CREATE TABLE IF NOT EXISTS app_config (key TEXT PRIMARY KEY, value TEXT NOT NULL)`;
    const [row] = await sql`SELECT value FROM app_config WHERE key = 'password_hash'`;
    if (!row || !verifyPassword(password, row.value)) {
      return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': createSessionCookie() }
    });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
