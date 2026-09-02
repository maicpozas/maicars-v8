import { neon } from '@netlify/neon';
import { hashPassword } from './lib/auth.js';

export default async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { token, newPassword } = await req.json();
    if (!token || !newPassword || newPassword.length < 8) return new Response('Datos inválidos', { status: 400 });
    const sql = neon();
    const [row] = await sql`SELECT user_id FROM password_resets WHERE token = ${token} AND expires_at > now()`;
    if (!row) return new Response('El enlace no es válido o expiró', { status: 400 });
    const hash = hashPassword(newPassword);
    await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${row.user_id}`;
    await sql`DELETE FROM password_resets WHERE token = ${token}`;
    return Response.json({ ok: true });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
