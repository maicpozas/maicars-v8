import { neon } from '@netlify/neon';
import { isAuthenticated } from './lib/auth.js';

export default async (req) => {
  if (!isAuthenticated(req)) return new Response('No autorizado', { status: 401 });
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { vehiculos } = await req.json();
    if (!Array.isArray(vehiculos)) return new Response('Formato inválido', { status: 400 });
    const sql = neon();
    await sql`CREATE TABLE IF NOT EXISTS inventario (id TEXT PRIMARY KEY, marca TEXT NOT NULL, modelo TEXT NOT NULL, anio INTEGER NOT NULL, compra INTEGER NOT NULL, img TEXT, created_at TIMESTAMPTZ DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS gastos (id TEXT PRIMARY KEY, auto_id TEXT NOT NULL REFERENCES inventario(id) ON DELETE CASCADE, nombre TEXT NOT NULL, monto INTEGER NOT NULL, fecha TIMESTAMPTZ NOT NULL)`;
    let importados = 0;
    for (const v of vehiculos) {
      if (!v.marca || !v.modelo || !v.anio || !v.compra) continue;
      const id = crypto.randomUUID();
      await sql`INSERT INTO inventario (id, marca, modelo, anio, compra, img) VALUES (${id}, ${v.marca}, ${v.modelo}, ${v.anio}, ${v.compra}, ${v.img ?? null})`;
      for (const g of (v.gastos || [])) {
        if (!g.nombre || !g.monto) continue;
        const gid = crypto.randomUUID();
        await sql`INSERT INTO gastos (id, auto_id, nombre, monto, fecha) VALUES (${gid}, ${id}, ${g.nombre}, ${g.monto}, ${g.fecha || new Date().toISOString()})`;
      }
      importados++;
    }
    return Response.json({ ok: true, importados });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
