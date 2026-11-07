/**
 * Sanitize rich-text HTML before it is stored or served.
 * Strips dangerous tags (script, iframe, object, embed, applet, style, base, meta, link),
 * event handlers (on* attributes like onclick, onload, onerror),
 * and javascript:/vbscript:/data: URIs in href/src.
 */
export const sanitizeHtml = (html) => {
  if (typeof html !== 'string' || !html.trim()) return html;

  return html
    // 1. Strip script tags and their contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // 2. Strip dangerous tags
    .replace(/<\/?(?:iframe|object|embed|applet|style|base|meta|link)\b[^>]*>/gi, '')
    // 3. Strip event handlers (e.g. onload=, onclick=, onerror=)
    .replace(/\s+on[a-z]+(\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+))/gi, '')
    // 4. Strip dangerous javascript: and vbscript: URIs
    .replace(/(?:href|src|xlink:href)\s*=\s*(['"])\s*(?:javascript|vbscript|data):.*?\1/gi, '$1#$1');
};

/**
 * Escape user input before embedding it in a RegExp / Mongo $regex,
 * preventing ReDoS and pattern injection.
 */
export const escapeRegex = (str = '') => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default { sanitizeHtml, escapeRegex };
