import { neon } from '@netlify/neon';
import { isAuthenticated } from './lib/auth.js';
import { normalizeCategoria } from './lib/categorias.js';
import { isValidId, isValidText, isValidMoney } from './lib/validate.js';

export default async (req) => {
  const userId = isAuthenticated(req);
  if (!userId) return new Response('No autorizado', { status: 401 });
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { id, nombre, monto, fechaISO, categoria } = await req.json();
    if (!isValidId(id)) return new Response('id inválido', { status: 400 });
    if (!isValidText(nombre)) return new Response('Nombre inválido', { status: 400 });
    if (!isValidMoney(monto)) return new Response('Monto inválido', { status: 400 });
    const sql = neon();
    const rows = await sql`
      UPDATE gastos SET nombre = ${nombre}, monto = ${monto}, fecha = ${fechaISO || new Date().toISOString()}, categoria = ${normalizeCategoria(categoria)}
      WHERE id = ${id} AND auto_id IN (SELECT id FROM inventario WHERE user_id = ${userId})
      RETURNING id
    `;
    if (rows.length === 0) return new Response('No encontrado', { status: 404 });
    return Response.json({ ok: true });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
