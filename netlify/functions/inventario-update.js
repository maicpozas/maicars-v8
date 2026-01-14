\
import { neon } from '@netlify/neon';
export default async (req) => {
  try { if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 }); const { id, compra } = await req.json(); if(!id || compra==null) return new Response('Faltan datos', { status: 400 }); const sql = neon(); await sql`UPDATE inventario SET compra = ${compra} WHERE id = ${id}`; return Response.json({ ok:true }); }
  catch(e){ return new Response(e.message || 'Error', { status: 500 }); }
}
