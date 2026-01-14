\
import { neon } from '@netlify/neon';
export default async () => {
  try{ const sql = neon(); const rows = await sql`SELECT id, marca, modelo, anio, compra, img, created_at FROM inventario ORDER BY created_at DESC`; return Response.json(rows); }
  catch(e){ return new Response(e.message || 'Error', { status: 500 }); }
}
