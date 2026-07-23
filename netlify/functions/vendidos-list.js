import { neon } from '@netlify/neon';
export default async () => {
  try{
    const sql = neon();
    await sql`CREATE TABLE IF NOT EXISTS vendidos (id TEXT PRIMARY KEY, marca TEXT NOT NULL, modelo TEXT NOT NULL, anio INTEGER NOT NULL, compra INTEGER NOT NULL, gastos_total INTEGER NOT NULL, venta INTEGER NOT NULL, ganancia INTEGER NOT NULL, fecha_venta TIMESTAMPTZ NOT NULL, img TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS vendidos_gastos (id TEXT PRIMARY KEY, vendido_id TEXT NOT NULL REFERENCES vendidos(id) ON DELETE CASCADE, nombre TEXT NOT NULL, monto INTEGER NOT NULL, fecha TIMESTAMPTZ)`;
    const vendidos = await sql`SELECT * FROM vendidos ORDER BY fecha_venta DESC`;
    const detalle = {};
    for(const v of vendidos){ detalle[v.id] = await sql`SELECT nombre, monto, fecha FROM vendidos_gastos WHERE vendido_id = ${v.id}`; }
    return Response.json({ vendidos, detalle });
  }
  catch(e){ return new Response(e.message || 'Error', { status: 500 }); }
}
