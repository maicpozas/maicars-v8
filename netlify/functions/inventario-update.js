import { neon } from '@netlify/neon';
import { isAuthenticated } from './lib/auth.js';

export default async (req) => {
  if (!isAuthenticated(req)) return new Response('No autorizado', { status: 401 });
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { id, marca, modelo, anio, compra, img } = await req.json();
    if (!id || !marca || !modelo || !anio || compra == null) return new Response('Faltan datos', { status: 400 });
    const sql = neon();
    await sql`UPDATE inventario SET marca = ${marca}, modelo = ${modelo}, anio = ${anio}, compra = ${compra}, img = ${img ?? null} WHERE id = ${id}`;
    return Response.json({ ok: true });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
