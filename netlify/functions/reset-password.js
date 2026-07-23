import { neon } from '@netlify/neon';
import { hashPassword } from './lib/auth.js';

export default async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { token, newPassword } = await req.json();
    if (!token || !newPassword || newPassword.length < 6) return new Response('Datos inválidos', { status: 400 });
    const sql = neon();
    await sql`CREATE TABLE IF NOT EXISTS password_resets (token TEXT PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL)`;
    const [row] = await sql`SELECT token FROM password_resets WHERE token = ${token} AND expires_at > now()`;
    if (!row) return new Response('El enlace no es válido o expiró', { status: 400 });
    const hash = hashPassword(newPassword);
    await sql`CREATE TABLE IF NOT EXISTS app_config (key TEXT PRIMARY KEY, value TEXT NOT NULL)`;
    await sql`INSERT INTO app_config (key, value) VALUES ('password_hash', ${hash}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
    await sql`DELETE FROM password_resets WHERE token = ${token}`;
    return Response.json({ ok: true });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
