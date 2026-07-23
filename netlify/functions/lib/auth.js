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

export function createSessionCookie() {
  const secret = process.env.AUTH_SECRET;
  const expiry = String(Date.now() + MAX_AGE * 1000);
  const sig = sign(expiry, secret);
  const token = encodeURIComponent(`${expiry}.${sig}`);
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function isAuthenticated(req) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(COOKIE_NAME + '=([^;]+)'));
  if (!match) return false;
  const raw = decodeURIComponent(match[1]);
  const dot = raw.lastIndexOf('.');
  if (dot === -1) return false;
  const expiry = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!expiry || !sig || !/^\d+$/.test(expiry)) return false;
  if (!timingSafeEqual(sign(expiry, secret), sig)) return false;
  if (Number(expiry) < Date.now()) return false;
  return true;
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
