import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize rich-text HTML before it is stored or served.
 * Strips scripts, event handlers, javascript:/data: URIs, etc.
 */
export const sanitizeHtml = (html) => {
  if (typeof html !== 'string' || html === '') return html;
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
};

/**
 * Escape user input before embedding it in a RegExp / Mongo $regex,
 * preventing ReDoS and pattern injection.
 */
export const escapeRegex = (str = '') => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
