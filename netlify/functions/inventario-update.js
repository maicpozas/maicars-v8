import { neon } from '@netlify/neon';
import { isAuthenticated } from './lib/auth.js';
import { isValidId, isValidText, isValidYear, isValidMoney, isValidImg } from './lib/validate.js';

export default async (req) => {
  const userId = isAuthenticated(req);
  if (!userId) return new Response('No autorizado', { status: 401 });
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { id, marca, modelo, anio, compra, img, fecha_compra } = await req.json();
    if (!isValidId(id)) return new Response('id inválido', { status: 400 });
    if (!isValidText(marca) || !isValidText(modelo)) return new Response('Marca/modelo inválidos', { status: 400 });
    if (!isValidYear(anio)) return new Response('Año inválido', { status: 400 });
    if (!isValidMoney(compra)) return new Response('Costo de compra inválido', { status: 400 });
    if (!isValidImg(img)) return new Response('Imagen inválida', { status: 400 });
    if (!fecha_compra) return new Response('Falta fecha de compra', { status: 400 });
    const sql = neon();
    const rows = await sql`UPDATE inventario SET marca = ${marca}, modelo = ${modelo}, anio = ${anio}, compra = ${compra}, img = ${img ?? null}, fecha_compra = ${fecha_compra} WHERE id = ${id} AND user_id = ${userId} RETURNING id`;
    if (rows.length === 0) return new Response('No encontrado', { status: 404 });
    return Response.json({ ok: true });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
