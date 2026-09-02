import { neon } from '@netlify/neon';
import { isAuthenticated } from './lib/auth.js';

export default async (req) => {
  const userId = isAuthenticated(req);
  if (!userId) return new Response('No autorizado', { status: 401 });
  try {
    const sql = neon();
    const rows = await sql`SELECT id, marca, modelo, anio, compra, img, created_at FROM inventario WHERE user_id = ${userId} ORDER BY created_at DESC`;
    return Response.json(rows);
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
