import { neon } from '@netlify/neon';
import { isAuthenticated } from './lib/auth.js';

export default async (req) => {
  const userId = isAuthenticated(req);
  if (!userId) return new Response('No autorizado', { status: 401 });
  try {
    const sql = neon();
    const vendidos = await sql`SELECT * FROM vendidos WHERE user_id = ${userId} ORDER BY fecha_venta DESC`;
    const detalle = {};
    for (const v of vendidos) { detalle[v.id] = await sql`SELECT nombre, monto, fecha FROM vendidos_gastos WHERE vendido_id = ${v.id}`; }
    return Response.json({ vendidos, detalle });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
