import { neon } from '@netlify/neon';
import { isAuthenticated } from './lib/auth.js';
import { expireDuePlans } from './lib/plans.js';

export default async (req) => {
  const userId = isAuthenticated(req);
  if (!userId) return Response.json({ authenticated: false });
  try {
    const sql = neon();
    await expireDuePlans(sql);
    const [user] = await sql`SELECT email, nombre, plan FROM users WHERE id = ${userId}`;
    if (!user) return Response.json({ authenticated: false });
    return Response.json({ authenticated: true, user });
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
