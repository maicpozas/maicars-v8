import { neon } from '@netlify/neon';
export default async (req) => {
  try{ const url = new URL(req.url); const auto_id = url.searchParams.get('auto_id'); if(!auto_id) return new Response('Falta auto_id', { status: 400 }); const sql = neon(); await sql`CREATE TABLE IF NOT EXISTS gastos (id TEXT PRIMARY KEY, auto_id TEXT NOT NULL REFERENCES inventario(id) ON DELETE CASCADE, nombre TEXT NOT NULL, monto INTEGER NOT NULL, fecha TIMESTAMPTZ NOT NULL)`; const rows = await sql`SELECT id, auto_id, nombre, monto, fecha FROM gastos WHERE auto_id = ${auto_id} ORDER BY fecha DESC`; return Response.json(rows); }
  catch(e){ return new Response(e.message || 'Error', { status: 500 }); }
}
