\
import { neon } from '@netlify/neon';
export default async (req) => {
  try{ if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 }); const { id } = await req.json(); if(!id) return new Response('Falta id', { status: 400 }); const sql = neon(); await sql`DELETE FROM gastos WHERE auto_id = ${id}`; await sql`DELETE FROM inventario WHERE id = ${id}`; return Response.json({ ok:true }); }
  catch(e){ return new Response(e.message || 'Error', { status: 500 }); }
}
