import { neon } from '@netlify/neon';
import { isAuthenticated } from './lib/auth.js';

export default async (req) => {
  if (!isAuthenticated(req)) return new Response('No autorizado', { status: 401 });
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { auto_id, nombre, monto, fechaISO } = await req.json();
    if (!auto_id || !nombre || !monto) return new Response('Faltan datos', { status: 400 });
    const sql = neon();
    await sql`CREATE TABLE IF NOT EXISTS gastos (id TEXT PRIMARY KEY, auto_id TEXT NOT NULL REFERENCES inventario(id) ON DELETE CASCADE, nombre TEXT NOT NULL, monto INTEGER NOT NULL, fecha TIMESTAMPTZ NOT NULL)`;
    const id = crypto.randomUUID();
    await sql`INSERT INTO gastos (id, auto_id, nombre, monto, fecha) VALUES (${id}, ${auto_id}, ${nombre}, ${monto}, ${fechaISO || new Date().toISOString()})`;
    return Response.json({ ok: true, id });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
