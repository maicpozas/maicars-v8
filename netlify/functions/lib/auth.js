import crypto from 'node:crypto';

const COOKIE_NAME = 'maicars_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 días

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function createSessionCookie(userId) {
  const secret = process.env.AUTH_SECRET;
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + MAX_AGE * 1000 })).toString('base64url');
  const sig = sign(payload, secret);
  const token = `${payload}.${sig}`;
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

/**
 * Devuelve el user_id de la sesión válida, o null si no hay sesión
 * (falta cookie, firma inválida, o expiró).
 */
export function isAuthenticated(req) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(COOKIE_NAME + '=([^;]+)'));
  if (!match) return null;
  const raw = decodeURIComponent(match[1]);
  const dot = raw.lastIndexOf('.');
  if (dot === -1) return null;
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!payload || !sig) return null;
  if (!timingSafeEqual(sign(payload, secret), sig)) return null;
  let data;
  try { data = JSON.parse(Buffer.from(payload, 'base64url').toString()); }
  catch (e) { return null; }
  if (!data || !data.uid || !data.exp) return null;
  if (Number(data.exp) < Date.now()) return null;
  return data.uid;
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !password) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(testHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
