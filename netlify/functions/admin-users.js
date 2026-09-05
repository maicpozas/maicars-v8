import { neon } from '@netlify/neon';
import { isAuthenticated } from './lib/auth.js';

export default async (req) => {
  const userId = isAuthenticated(req);
  if (!userId) return new Response('No autorizado', { status: 401 });
  try {
    const sql = neon();
    const [me] = await sql`SELECT plan FROM users WHERE id = ${userId}`;
    if (me?.plan !== 'owner') return new Response('No autorizado', { status: 403 });

    const rows = await sql`
      SELECT u.email, u.nombre, u.plan, u.created_at,
             COALESCE(inv.n, 0) AS activos,
             COALESCE(ven.n, 0) AS vendidos
      FROM users u
      LEFT JOIN (SELECT user_id, COUNT(*)::int AS n FROM inventario GROUP BY user_id) inv ON inv.user_id = u.id
      LEFT JOIN (SELECT user_id, COUNT(*)::int AS n FROM vendidos GROUP BY user_id) ven ON ven.user_id = u.id
      ORDER BY u.created_at ASC
    `;
    return Response.json(rows);
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
