import { neon } from '@netlify/neon';
import { isAuthenticated } from './lib/auth.js';
import { normalizeCategoria } from './lib/categorias.js';
import { isValidId, isValidText, isValidMoney } from './lib/validate.js';

export default async (req) => {
  const userId = isAuthenticated(req);
  if (!userId) return new Response('No autorizado', { status: 401 });
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { auto_id, nombre, monto, fechaISO, categoria } = await req.json();
    if (!isValidId(auto_id)) return new Response('Vehículo inválido', { status: 400 });
    if (!isValidText(nombre)) return new Response('Nombre inválido', { status: 400 });
    if (!isValidMoney(monto)) return new Response('Monto inválido', { status: 400 });
    const sql = neon();
    const [auto] = await sql`SELECT id FROM inventario WHERE id = ${auto_id} AND user_id = ${userId}`;
    if (!auto) return new Response('Vehículo no encontrado', { status: 404 });
    const id = crypto.randomUUID();
    await sql`INSERT INTO gastos (id, auto_id, nombre, monto, fecha, categoria) VALUES (${id}, ${auto_id}, ${nombre}, ${monto}, ${fechaISO || new Date().toISOString()}, ${normalizeCategoria(categoria)})`;
    return Response.json({ ok: true, id });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
