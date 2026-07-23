import { neon } from '@netlify/neon';
import { isAuthenticated } from './lib/auth.js';

export default async (req) => {
  if (!isAuthenticated(req)) return new Response('No autorizado', { status: 401 });
  try {
    const sql = neon();
    await sql`CREATE TABLE IF NOT EXISTS inventario (id TEXT PRIMARY KEY, marca TEXT NOT NULL, modelo TEXT NOT NULL, anio INTEGER NOT NULL, compra INTEGER NOT NULL, img TEXT, created_at TIMESTAMPTZ DEFAULT now())`;
    const rows = await sql`SELECT id, marca, modelo, anio, compra, img, created_at FROM inventario ORDER BY created_at DESC`;
    return Response.json(rows);
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
