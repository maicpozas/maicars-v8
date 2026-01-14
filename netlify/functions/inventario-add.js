\
import { neon } from '@netlify/neon';

export default async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { id, marca, modelo, anio, compra, img } = await req.json();
    if (!id || !marca || !modelo || !anio || !compra) return new Response('Faltan campos', { status: 400 });
    const sql = neon();
    await sql`CREATE TABLE IF NOT EXISTS inventario (id TEXT PRIMARY KEY, marca TEXT NOT NULL, modelo TEXT NOT NULL, anio INTEGER NOT NULL, compra INTEGER NOT NULL, img TEXT, created_at TIMESTAMPTZ DEFAULT now())`;
    await sql`INSERT INTO inventario (id, marca, modelo, anio, compra, img) VALUES (${id}, ${marca}, ${modelo}, ${anio}, ${compra}, ${img}) ON CONFLICT (id) DO NOTHING`;
    return Response.json({ ok: true });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
