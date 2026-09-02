import { clearSessionCookie } from './lib/auth.js';

export default async () => {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearSessionCookie() }
  });
}
