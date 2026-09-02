import { neon } from '@netlify/neon';
import { isAuthenticated } from './lib/auth.js';

export default async (req) => {
  const userId = isAuthenticated(req);
  if (!userId) return new Response('No autorizado', { status: 401 });
  try {
    const url = new URL(req.url);
    const auto_id = url.searchParams.get('auto_id');
    if (!auto_id) return new Response('Falta auto_id', { status: 400 });
    const sql = neon();
    const rows = await sql`
      SELECT g.id, g.auto_id, g.nombre, g.monto, g.fecha
      FROM gastos g
      JOIN inventario i ON g.auto_id = i.id
      WHERE g.auto_id = ${auto_id} AND i.user_id = ${userId}
      ORDER BY g.fecha DESC
    `;
    return Response.json(rows);
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
