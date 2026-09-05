import { neon } from '@netlify/neon';
import { createSessionCookie, verifyPassword, normalizeEmail } from './lib/auth.js';
import { expireDuePlans } from './lib/plans.js';
import { checkRateLimit, recordAttempt, clearAttempts, getClientIp } from './lib/ratelimit.js';

export default async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { email: rawEmail, password } = await req.json();
    const email = normalizeEmail(rawEmail);
    const ip = getClientIp(req);
    const invalid = () => new Response(JSON.stringify({ ok: false, message: 'Correo o contraseña incorrectos' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    const tooMany = () => new Response(JSON.stringify({ ok: false, message: 'Demasiados intentos. Intenta de nuevo en unos minutos.' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
    if (!email || !password) return invalid();

    const sql = neon();
    await expireDuePlans(sql);

    const emailOk = await checkRateLimit(sql, 'login', email, { maxAttempts: 5, windowMinutes: 15 });
    const ipOk = await checkRateLimit(sql, 'login_ip', ip, { maxAttempts: 20, windowMinutes: 15 });
    if (!emailOk || !ipOk) return tooMany();

    const [user] = await sql`SELECT id, password_hash FROM users WHERE email = ${email}`;
    if (!user || !verifyPassword(password, user.password_hash)) {
      await recordAttempt(sql, 'login', email);
      await recordAttempt(sql, 'login_ip', ip);
      return invalid();
    }

    await clearAttempts(sql, 'login', email);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': createSessionCookie(user.id) }
    });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
