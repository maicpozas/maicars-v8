import { neon } from '@netlify/neon';
import { isAuthenticated } from './lib/auth.js';
import { expireDuePlans } from './lib/plans.js';
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
    const fechaCompra = fecha_compra || new Date().toISOString().slice(0, 10);
    const sql = neon();
    await expireDuePlans(sql);
    const [user] = await sql`SELECT plan FROM users WHERE id = ${userId}`;
    if (user?.plan === 'free') {
      const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM inventario WHERE user_id = ${userId}`;
      if (n >= 3) return new Response('Límite del plan gratuito alcanzado', { status: 403 });
    }
    await sql`INSERT INTO inventario (id, user_id, marca, modelo, anio, compra, img, fecha_compra) VALUES (${id}, ${userId}, ${marca}, ${modelo}, ${anio}, ${compra}, ${img}, ${fechaCompra}) ON CONFLICT (id) DO NOTHING`;
    return Response.json({ ok: true });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
