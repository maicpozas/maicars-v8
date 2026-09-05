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
    const [auto] = await sql`SELECT id FROM inventario WHERE id = ${auto_id} AND user_id = ${userId}`;
    if (!auto) return new Response('Vehículo no encontrado', { status: 404 });
    const rows = await sql`SELECT id, auto_id, nombre, monto, fecha FROM gastos WHERE auto_id = ${auto_id} ORDER BY fecha DESC`;
    return Response.json(rows);
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
