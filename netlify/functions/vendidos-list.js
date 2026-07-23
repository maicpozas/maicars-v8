import { neon } from '@netlify/neon';
export default async () => {
  try{ const sql = neon(); const vendidos = await sql`SELECT * FROM vendidos ORDER BY fecha_venta DESC`; const detalle = {}; for(const v of vendidos){ detalle[v.id] = await sql`SELECT nombre, monto, fecha FROM vendidos_gastos WHERE vendido_id = ${v.id}`; } return Response.json({ vendidos, detalle }); }
  catch(e){ return new Response(e.message || 'Error', { status: 500 }); }
}
