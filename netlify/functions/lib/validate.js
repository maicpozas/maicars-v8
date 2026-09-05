const CURRENT_YEAR = new Date().getFullYear();
export const MAX_IMG_LENGTH = 2_000_000; // ~1.4MB decodificado, de sobra para una foto comprimida a 960px
export const MAX_TEXT_LENGTH = 200;
export const MAX_ID_LENGTH = 100;
export const MAX_BATCH_SIZE = 500;

export function isValidYear(anio) {
  const n = Number(anio);
  return Number.isInteger(n) && n >= 1900 && n <= CURRENT_YEAR + 1;
}

export function isValidMoney(n) {
  const num = Number(n);
  return Number.isFinite(num) && num > 0;
}

export function isValidId(id) {
  return typeof id === 'string' && id.length > 0 && id.length <= MAX_ID_LENGTH;
}

export function isValidText(s, maxLength = MAX_TEXT_LENGTH) {
  return typeof s === 'string' && s.trim().length > 0 && s.length <= maxLength;
}

export function isValidImg(img) {
  if (img == null) return true;
  if (typeof img !== 'string') return false;
  if (img.length > MAX_IMG_LENGTH) return false;
  return /^https?:\/\//.test(img) || /^data:image\/(png|jpe?g|webp|gif);base64,/.test(img);
}
