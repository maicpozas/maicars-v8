import { neon } from '@netlify/neon';
import { isAuthenticated } from './lib/auth.js';

export default async (req) => {
  const userId = isAuthenticated(req);
  if (!userId) return new Response('No autorizado', { status: 401 });
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { id, marca, modelo, anio, compra, img, fecha_compra } = await req.json();
    if (!id || !marca || !modelo || !anio || !compra) return new Response('Faltan campos', { status: 400 });
    const fechaCompra = fecha_compra || new Date().toISOString().slice(0, 10);
    const sql = neon();
    await sql`INSERT INTO inventario (id, user_id, marca, modelo, anio, compra, img, fecha_compra) VALUES (${id}, ${userId}, ${marca}, ${modelo}, ${anio}, ${compra}, ${img}, ${fechaCompra}) ON CONFLICT (id) DO NOTHING`;
    return Response.json({ ok: true });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
