import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { hi as hiLocale, gu as guLocale } from 'date-fns/locale';

const DATE_LOCALES = { hi: hiLocale, gu: guLocale };

/**
 * Returns a relative time string, e.g. "2 hours ago" / "2 घंटे पहले".
 */
export function timeAgo(dateStr, lang) {
  if (!dateStr) return '';
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: DATE_LOCALES[lang] });
}

/**
 * Returns a formatted date string, e.g. "May 27, 2026" / "27 मई 2026".
 */
export function formatDate(dateStr, fmt, lang) {
  if (!dateStr) return '';
  const isIndic = lang && DATE_LOCALES[lang];
  return format(parseISO(dateStr), fmt || (isIndic ? 'd MMMM yyyy' : 'MMMM d, yyyy'), {
    locale: DATE_LOCALES[lang],
  });
}

/**
 * Builds a Cloudinary URL with optional transformations.
 * If the URL is not from Cloudinary, returns it unchanged.
 */
export function buildImageUrl(url, { width = 800, quality = 'auto', format = 'webp' } = {}) {
  if (!url) return '';
  if (!url.includes('cloudinary.com')) return url;
  // Insert transformation before /upload/
  return url.replace('/upload/', `/upload/w_${width},q_${quality},f_${format}/`);
}

/**
 * Truncates a string to maxLength, appending '…' if needed.
 */
export function truncate(str, maxLength = 120) {
  if (!str) return '';
  return str.length <= maxLength ? str : str.slice(0, maxLength).trimEnd() + '…';
}

/**
 * Serialize an object for a JSON-LD <script> tag. Escapes '<' so user-supplied
 * strings (titles, tags) can never break out of the script context.
 */
export function jsonLdSafe(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}
