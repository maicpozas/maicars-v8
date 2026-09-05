import { neon } from '@netlify/neon';
import crypto from 'node:crypto';
import { normalizeEmail } from './lib/auth.js';
import { checkRateLimit, recordAttempt } from './lib/ratelimit.js';

async function sendEmail({ to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || 'MaiCars <onboarding@resend.dev>',
      to: [to],
      subject,
      html
    })
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error('No se pudo enviar el correo: ' + t.slice(0, 200));
  }
}

export default async (req) => {
  const generic = () => Response.json({ ok: true, message: 'Si el correo existe, recibirás un enlace.' });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const { email: rawEmail } = await req.json();
    const email = normalizeEmail(rawEmail); // destinatario: siempre el correo que envía el solicitante
    if (!email) return generic();

    const sql = neon();

    // Límite por correo: evita saturar la bandeja de un tercero o
    // agotar la cuota de envío. Se responde igual (genérico) esté o
    // no limitado, para no filtrar información.
    const withinLimit = await checkRateLimit(sql, 'forgot_password', email, { maxAttempts: 3, windowMinutes: 15 });
    if (!withinLimit) return generic();
    await recordAttempt(sql, 'forgot_password', email);

    const [user] = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (!user) return generic(); // no revela si el correo existe o no

    await sql`DELETE FROM password_resets WHERE expires_at < now()`;
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await sql`INSERT INTO password_resets (token, user_id, expires_at) VALUES (${token}, ${user.id}, ${expiresAt})`;
    const origin = new URL(req.url).origin;
    const link = `${origin}/?reset=${token}`;

    try {
      await sendEmail({
        to: email,
        subject: 'Restablecer contraseña de MaiCars',
        html: `
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta de MaiCars.</p>
          <p><a href="${link}">Haz clic aquí para elegir una nueva contraseña</a></p>
          <p>Este enlace expira en 30 minutos. Si no fuiste tú, ignora este correo.</p>
        `
      });
    } catch (sendErr) {
      console.error('forgot-password: falló el envío con Resend para', email, '->', sendErr.message);
    }

    return generic();
  } catch (e) {
    console.error('forgot-password: error inesperado ->', e.message);
    return generic();
  }
}
