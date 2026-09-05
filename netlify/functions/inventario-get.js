import { neon } from '@netlify/neon';
import { isAuthenticated } from './lib/auth.js';

export default async (req) => {
  const userId = isAuthenticated(req);
  if (!userId) return new Response('No autorizado', { status: 401 });
  try {
    const sql = neon();
    const rows = await sql`
      SELECT i.id, i.marca, i.modelo, i.anio, i.compra, i.img, i.fecha_compra, i.created_at,
             COALESCE(SUM(g.monto), 0)::int AS gastos_total
      FROM inventario i
      LEFT JOIN gastos g ON g.auto_id = i.id
      WHERE i.user_id = ${userId}
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `;
    return Response.json(rows);
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
