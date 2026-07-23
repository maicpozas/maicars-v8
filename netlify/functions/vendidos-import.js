import { neon } from '@netlify/neon';
import { isAuthenticated } from './lib/auth.js';

export default async (req) => {
  if (!isAuthenticated(req)) return new Response('No autorizado', { status: 401 });
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { vendidos } = await req.json();
    if (!Array.isArray(vendidos)) return new Response('Formato inválido', { status: 400 });
    const sql = neon();
    await sql`CREATE TABLE IF NOT EXISTS vendidos (id TEXT PRIMARY KEY, marca TEXT NOT NULL, modelo TEXT NOT NULL, anio INTEGER NOT NULL, compra INTEGER NOT NULL, gastos_total INTEGER NOT NULL, venta INTEGER NOT NULL, ganancia INTEGER NOT NULL, fecha_venta TIMESTAMPTZ NOT NULL, img TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS vendidos_gastos (id TEXT PRIMARY KEY, vendido_id TEXT NOT NULL REFERENCES vendidos(id) ON DELETE CASCADE, nombre TEXT NOT NULL, monto INTEGER NOT NULL, fecha TIMESTAMPTZ)`;
    let importados = 0;
    for (const v of vendidos) {
      if (!v.marca || !v.modelo || !v.anio || v.compra == null || v.venta == null) continue;
      const id = crypto.randomUUID();
      const gastosTotal = Number(v.gastosTotal ?? 0);
      const ganancia = Number(v.venta) - Number(v.compra) - gastosTotal;
      await sql`INSERT INTO vendidos (id, marca, modelo, anio, compra, gastos_total, venta, ganancia, fecha_venta, img) VALUES (${id}, ${v.marca}, ${v.modelo}, ${v.anio}, ${v.compra}, ${gastosTotal}, ${v.venta}, ${ganancia}, ${v.fechaVenta || new Date().toISOString()}, ${v.img ?? null})`;
      for (const g of (v.gastosDetalle || [])) {
        if (!g.nombre || !g.monto) continue;
        const gid = crypto.randomUUID();
        await sql`INSERT INTO vendidos_gastos (id, vendido_id, nombre, monto, fecha) VALUES (${gid}, ${id}, ${g.nombre}, ${g.monto}, ${g.fecha || null})`;
      }
      importados++;
    }
    return Response.json({ ok: true, importados });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
