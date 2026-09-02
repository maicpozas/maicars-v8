import { neon } from '@netlify/neon';
import { createSessionCookie, verifyPassword, normalizeEmail } from './lib/auth.js';

export default async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { email: rawEmail, password } = await req.json();
    const email = normalizeEmail(rawEmail);
    const invalid = () => new Response(JSON.stringify({ ok: false, message: 'Correo o contraseña incorrectos' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    if (!email || !password) return invalid();

    const sql = neon();
    const [user] = await sql`SELECT id, password_hash FROM users WHERE email = ${email}`;
    if (!user || !verifyPassword(password, user.password_hash)) return invalid();

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': createSessionCookie(user.id) }
    });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
