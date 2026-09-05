import { neon } from '@netlify/neon';
import { isAuthenticated } from './lib/auth.js';
import { isValidId, isValidMoney } from './lib/validate.js';

export default async (req) => {
  const userId = isAuthenticated(req);
  if (!userId) return new Response('No autorizado', { status: 401 });
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { id, venta } = await req.json();
    if (!isValidId(id)) return new Response('id inválido', { status: 400 });
    if (!isValidMoney(venta)) return new Response('Valor de venta inválido', { status: 400 });
    const sql = neon();
    const [auto] = await sql`SELECT * FROM inventario WHERE id = ${id} AND user_id = ${userId}`;
    if (!auto) return new Response('Auto no encontrado', { status: 404 });
    const gastos = await sql`SELECT * FROM gastos WHERE auto_id = ${id}`;
    const gastosTotal = gastos.reduce((a, g) => a + Number(g.monto || 0), 0);
    const ganancia = Number(venta) - Number(auto.compra || 0) - gastosTotal;
    await sql`INSERT INTO vendidos (id, user_id, marca, modelo, anio, compra, gastos_total, venta, ganancia, fecha_venta, fecha_compra, img) VALUES (${auto.id}, ${userId}, ${auto.marca}, ${auto.modelo}, ${auto.anio}, ${auto.compra}, ${gastosTotal}, ${venta}, ${ganancia}, ${new Date().toISOString()}, ${auto.fecha_compra}, ${auto.img})`;
    for (const g of gastos) {
      const gid = crypto.randomUUID();
      await sql`INSERT INTO vendidos_gastos (id, vendido_id, nombre, monto, fecha, categoria) VALUES (${gid}, ${auto.id}, ${g.nombre}, ${g.monto}, ${g.fecha}, ${g.categoria})`;
    }
    await sql`DELETE FROM gastos WHERE auto_id = ${id}`;
    await sql`DELETE FROM inventario WHERE id = ${id} AND user_id = ${userId}`;
    return Response.json({ ok: true, ganancia });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
