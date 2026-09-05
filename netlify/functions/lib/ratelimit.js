import crypto from 'node:crypto';

// Devuelve true si TODAVÍA se puede intentar (no se superó el límite).
export async function checkRateLimit(sql, action, identifier, { maxAttempts, windowMinutes }) {
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const [{ n }] = await sql`
    SELECT COUNT(*)::int AS n FROM rate_limits
    WHERE action = ${action} AND identifier = ${identifier} AND created_at > ${cutoff}
  `;
  return n < maxAttempts;
}

export async function recordAttempt(sql, action, identifier) {
  const id = crypto.randomUUID();
  await sql`INSERT INTO rate_limits (id, action, identifier) VALUES (${id}, ${action}, ${identifier})`;
  // Limpieza oportunista de intentos viejos, para que la tabla no crezca sin límite.
  await sql`DELETE FROM rate_limits WHERE created_at < now() - interval '1 day'`;
}

export async function clearAttempts(sql, action, identifier) {
  await sql`DELETE FROM rate_limits WHERE action = ${action} AND identifier = ${identifier}`;
}

export function getClientIp(req) {
  return req.headers.get('x-nf-client-connection-ip')
    || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || 'desconocida';
}
