import { neon } from '@netlify/neon';
import { isAuthenticated } from './lib/auth.js';
import { normalizeCategoria } from './lib/categorias.js';

export default async (req) => {
  const userId = isAuthenticated(req);
  if (!userId) return new Response('No autorizado', { status: 401 });
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { vendidos } = await req.json();
    if (!Array.isArray(vendidos)) return new Response('Formato inválido', { status: 400 });
    const sql = neon();
    let importados = 0;
    for (const v of vendidos) {
      if (!v.marca || !v.modelo || !v.anio || v.compra == null || v.venta == null) continue;
      const id = crypto.randomUUID();
      const gastosTotal = Number(v.gastosTotal ?? 0);
      const ganancia = Number(v.venta) - Number(v.compra) - gastosTotal;
      const fechaCompra = v.fecha_compra || new Date().toISOString().slice(0, 10);
      await sql`INSERT INTO vendidos (id, user_id, marca, modelo, anio, compra, gastos_total, venta, ganancia, fecha_venta, fecha_compra, img) VALUES (${id}, ${userId}, ${v.marca}, ${v.modelo}, ${v.anio}, ${v.compra}, ${gastosTotal}, ${v.venta}, ${ganancia}, ${v.fechaVenta || new Date().toISOString()}, ${fechaCompra}, ${v.img ?? null})`;
      for (const g of (v.gastosDetalle || [])) {
        if (!g.nombre || !g.monto) continue;
        const gid = crypto.randomUUID();
        await sql`INSERT INTO vendidos_gastos (id, vendido_id, nombre, monto, fecha, categoria) VALUES (${gid}, ${id}, ${g.nombre}, ${g.monto}, ${g.fecha || null}, ${normalizeCategoria(g.categoria)})`;
      }
      importados++;
    }
    return Response.json({ ok: true, importados });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
