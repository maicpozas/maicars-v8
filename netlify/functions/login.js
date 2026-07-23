import { createSessionCookie, checkPassword } from './lib/auth.js';

export default async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { password } = await req.json();
    if (!checkPassword(password)) {
      return new Response(JSON.stringify({ ok: false }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': createSessionCookie() }
    });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
