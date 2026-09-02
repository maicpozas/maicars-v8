import { neon } from '@netlify/neon';
import { isAuthenticated } from './lib/auth.js';

export default async (req) => {
  const userId = isAuthenticated(req);
  if (!userId) return new Response('No autorizado', { status: 401 });
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { auto_id, nombre, monto, fechaISO } = await req.json();
    if (!auto_id || !nombre || !monto) return new Response('Faltan datos', { status: 400 });
    const sql = neon();
    const [auto] = await sql`SELECT id FROM inventario WHERE id = ${auto_id} AND user_id = ${userId}`;
    if (!auto) return new Response('Vehículo no encontrado', { status: 404 });
    const id = crypto.randomUUID();
    await sql`INSERT INTO gastos (id, auto_id, nombre, monto, fecha) VALUES (${id}, ${auto_id}, ${nombre}, ${monto}, ${fechaISO || new Date().toISOString()})`;
    return Response.json({ ok: true, id });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
