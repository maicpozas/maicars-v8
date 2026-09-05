import { neon } from '@netlify/neon';
import crypto from 'node:crypto';
import { createSessionCookie, hashPassword, normalizeEmail, isValidEmail } from './lib/auth.js';
import { checkRateLimit, recordAttempt, getClientIp } from './lib/ratelimit.js';
import { MAX_TEXT_LENGTH } from './lib/validate.js';

export default async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const ip = getClientIp(req);
    const sql = neon();
    const ipOk = await checkRateLimit(sql, 'register', ip, { maxAttempts: 10, windowMinutes: 60 });
    if (!ipOk) return new Response('Demasiados intentos. Intenta de nuevo más tarde.', { status: 429 });

    const { email: rawEmail, password, nombre } = await req.json();
    const email = normalizeEmail(rawEmail);
    if (!email || !isValidEmail(email)) return new Response('Correo inválido', { status: 400 });
    if (!password || password.length < 8) return new Response('La contraseña debe tener al menos 8 caracteres', { status: 400 });
    if (nombre != null && (typeof nombre !== 'string' || nombre.length > MAX_TEXT_LENGTH)) return new Response('Nombre inválido', { status: 400 });

    await recordAttempt(sql, 'register', ip);

    const [existing] = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing) return new Response('Este correo ya está registrado', { status: 409 });

    const id = crypto.randomUUID();
    const hash = hashPassword(password);
    const nombreLimpio = nombre ? nombre.trim().slice(0, MAX_TEXT_LENGTH) : null;
    await sql`INSERT INTO users (id, email, password_hash, nombre, plan) VALUES (${id}, ${email}, ${hash}, ${nombreLimpio}, 'free')`;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': createSessionCookie(id) }
    });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
