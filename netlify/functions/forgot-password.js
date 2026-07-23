import { neon } from '@netlify/neon';
import crypto from 'node:crypto';

async function sendEmail({ to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || 'MaiCars <onboarding@resend.dev>',
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
  const generic = () => Response.json({ ok: true, message: 'Si el correo es correcto, te enviamos instrucciones.' });
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const { email } = await req.json();
    const recovery = (process.env.RECOVERY_EMAIL || '').toLowerCase();
    if (!email || !recovery || String(email).trim().toLowerCase() !== recovery) {
      return generic();
    }
    const sql = neon();
    await sql`CREATE TABLE IF NOT EXISTS password_resets (token TEXT PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL)`;
    await sql`DELETE FROM password_resets WHERE expires_at < now()`;
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await sql`INSERT INTO password_resets (token, expires_at) VALUES (${token}, ${expiresAt})`;
    const origin = new URL(req.url).origin;
    const link = `${origin}/?reset=${token}`;
    await sendEmail({
      to: email,
      subject: 'Restablecer contraseña de MaiCars',
      html: `
        <p>Recibimos una solicitud para restablecer la contraseña de tu app MaiCars.</p>
        <p><a href="${link}">Haz clic aquí para elegir una nueva contraseña</a></p>
        <p>Este enlace expira en 30 minutos. Si no fuiste tú, ignora este correo.</p>
      `
    });
    return generic();
  } catch (e) {
    return new Response(e.message || 'Error', { status: 500 });
  }
}
