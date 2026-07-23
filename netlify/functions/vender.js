import { neon } from '@netlify/neon';
import { isAuthenticated } from './lib/auth.js';

export default async (req) => {
  if (!isAuthenticated(req)) return new Response('No autorizado', { status: 401 });
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { id, venta } = await req.json();
    if (!id || !venta) return new Response('Faltan datos', { status: 400 });
    const sql = neon();
    await sql`CREATE TABLE IF NOT EXISTS vendidos (id TEXT PRIMARY KEY, marca TEXT NOT NULL, modelo TEXT NOT NULL, anio INTEGER NOT NULL, compra INTEGER NOT NULL, gastos_total INTEGER NOT NULL, venta INTEGER NOT NULL, ganancia INTEGER NOT NULL, fecha_venta TIMESTAMPTZ NOT NULL, img TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS vendidos_gastos (id TEXT PRIMARY KEY, vendido_id TEXT NOT NULL REFERENCES vendidos(id) ON DELETE CASCADE, nombre TEXT NOT NULL, monto INTEGER NOT NULL, fecha TIMESTAMPTZ)`;
    const [auto] = await sql`SELECT * FROM inventario WHERE id = ${id}`;
    if (!auto) return new Response('Auto no encontrado', { status: 404 });
    const gastos = await sql`SELECT * FROM gastos WHERE auto_id = ${id}`;
    const gastosTotal = gastos.reduce((a, g) => a + Number(g.monto || 0), 0);
    const ganancia = Number(venta) - Number(auto.compra || 0) - gastosTotal;
    await sql`INSERT INTO vendidos (id, marca, modelo, anio, compra, gastos_total, venta, ganancia, fecha_venta, img) VALUES (${auto.id}, ${auto.marca}, ${auto.modelo}, ${auto.anio}, ${auto.compra}, ${gastosTotal}, ${venta}, ${ganancia}, ${new Date().toISOString()}, ${auto.img})`;
    for (const g of gastos) {
      const gid = crypto.randomUUID();
      await sql`INSERT INTO vendidos_gastos (id, vendido_id, nombre, monto, fecha) VALUES (${gid}, ${auto.id}, ${g.nombre}, ${g.monto}, ${g.fecha})`;
    }
    await sql`DELETE FROM gastos WHERE auto_id = ${id}`;
    await sql`DELETE FROM inventario WHERE id = ${id}`;
    return Response.json({ ok: true, ganancia });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
