import { neon } from '@netlify/neon';
import { isAuthenticated } from './lib/auth.js';
import { normalizeCategoria } from './lib/categorias.js';
import { expireDuePlans } from './lib/plans.js';
import { isValidText, isValidYear, isValidMoney, isValidImg, MAX_BATCH_SIZE } from './lib/validate.js';

export default async (req) => {
  const userId = isAuthenticated(req);
  if (!userId) return new Response('No autorizado', { status: 401 });
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { vehiculos } = await req.json();
    if (!Array.isArray(vehiculos)) return new Response('Formato inválido', { status: 400 });
    if (vehiculos.length > MAX_BATCH_SIZE) return new Response(`Máximo ${MAX_BATCH_SIZE} vehículos por importación`, { status: 400 });

    const sql = neon();
    await expireDuePlans(sql);
    const [user] = await sql`SELECT plan FROM users WHERE id = ${userId}`;
    let cupo = Infinity;
    if (user?.plan === 'free') {
      const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM inventario WHERE user_id = ${userId}`;
      cupo = Math.max(0, 3 - n);
    }

    let importados = 0;
    let omitidosPorLimite = 0;
    for (const v of vehiculos) {
      if (!isValidText(v.marca) || !isValidText(v.modelo) || !isValidYear(v.anio) || !isValidMoney(v.compra) || !isValidImg(v.img)) continue;
      if (importados >= cupo) { omitidosPorLimite++; continue; }
      const id = crypto.randomUUID();
      const fechaCompra = v.fecha_compra || new Date().toISOString().slice(0, 10);
      await sql`INSERT INTO inventario (id, user_id, marca, modelo, anio, compra, img, fecha_compra) VALUES (${id}, ${userId}, ${v.marca}, ${v.modelo}, ${v.anio}, ${v.compra}, ${v.img ?? null}, ${fechaCompra})`;
      for (const g of (v.gastos || [])) {
        if (!isValidText(g.nombre) || !isValidMoney(g.monto)) continue;
        const gid = crypto.randomUUID();
        await sql`INSERT INTO gastos (id, auto_id, nombre, monto, fecha, categoria) VALUES (${gid}, ${id}, ${g.nombre}, ${g.monto}, ${g.fecha || new Date().toISOString()}, ${normalizeCategoria(g.categoria)})`;
      }
      importados++;
    }
    return Response.json({ ok: true, importados, omitidosPorLimite });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
