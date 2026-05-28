import { formatDistanceToNow, format, parseISO } from 'date-fns';

/**
 * Returns a relative time string, e.g. "2 hours ago".
 */
export function timeAgo(dateStr) {
  if (!dateStr) return '';
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
}

/**
 * Returns a formatted date string, e.g. "May 27, 2026".
 */
export function formatDate(dateStr, fmt = 'MMMM d, yyyy') {
  if (!dateStr) return '';
  return format(parseISO(dateStr), fmt);
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
