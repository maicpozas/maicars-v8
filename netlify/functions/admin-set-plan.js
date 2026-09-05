import { neon } from '@netlify/neon';
import { isAuthenticated, normalizeEmail } from './lib/auth.js';

const PLANES_VALIDOS = ['free', 'pro', 'owner'];

export default async (req) => {
  const userId = isAuthenticated(req);
  if (!userId) return new Response('No autorizado', { status: 401 });
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const sql = neon();
    const [me] = await sql`SELECT plan FROM users WHERE id = ${userId}`;
    if (me?.plan !== 'owner') return new Response('No autorizado', { status: 403 });

    const { email: rawEmail, plan } = await req.json();
    const email = normalizeEmail(rawEmail);
    if (!email || !PLANES_VALIDOS.includes(plan)) return new Response('Datos inválidos', { status: 400 });

    const expiresAt = plan === 'pro' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;
    const rows = await sql`UPDATE users SET plan = ${plan}, plan_expires_at = ${expiresAt} WHERE email = ${email} RETURNING id`;
    if (rows.length === 0) return new Response('Usuario no encontrado', { status: 404 });
    return Response.json({ ok: true });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
