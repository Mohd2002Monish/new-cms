const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Universal safe Image URL resolver for React Native with dynamic downsampling.
 * Handles:
 *  - string URLs ("https://...")
 *  - MongoDB backend image objects ({ url: "https://...", alt: "..." })
 *  - Dynamic width downsampling for Unsplash & Cloudinary
 * Returns null or a valid optimized URL string.
 */
export function getImageUrl(image, options = {}) {
  if (!image) return null;
  let rawUrl = null;
  if (typeof image === 'string') {
    const trimmed = image.trim();
    if (trimmed.length > 0) rawUrl = trimmed;
  } else if (typeof image === 'object') {
    if (typeof image.url === 'string' && image.url.trim().length > 0) {
      rawUrl = image.url.trim();
    } else if (typeof image.uri === 'string' && image.uri.trim().length > 0) {
      rawUrl = image.uri.trim();
    }
  }

  if (!rawUrl) return null;

  const width = options.width;
  if (!width || typeof width !== 'number') return rawUrl;

  // Unsplash dynamic resizing (reduces 1200px 3MB down to 300px ~25KB)
  if (rawUrl.includes('images.unsplash.com')) {
    if (rawUrl.includes('w=')) {
      return rawUrl.replace(/w=\d+/, `w=${width}&q=80`);
    }
    const separator = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${separator}w=${width}&q=80&auto=format&fit=crop`;
  }

  // Cloudinary dynamic resizing
  if (rawUrl.includes('res.cloudinary.com') && rawUrl.includes('/upload/')) {
    return rawUrl.replace('/upload/', `/upload/w_${width},q_auto,f_auto/`);
  }

  return rawUrl;
}

/**
 * Pure JavaScript time-ago formatter.
 * Avoids Hermes / Android ICU RangeErrors by using direct array lookup.
 */
export function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 0 || diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Recursively extract plain text from a Tiptap / ProseMirror JSON document
 */
function extractTiptapText(node) {
  if (!node) return '';
  if (typeof node.text === 'string') return node.text;
  if (Array.isArray(node.content)) {
    return node.content.map(extractTiptapText).filter(Boolean).join(' ');
  }
  return '';
}

/**
 * Safely strip HTML tags or extract text from strings or Tiptap JSON objects
 */
export function stripHtml(content) {
  if (!content) return '';
  if (typeof content === 'string') {
    return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  if (typeof content === 'object') {
    if (typeof content.contentHtml === 'string') {
      return stripHtml(content.contentHtml);
    }
    if (Array.isArray(content.content)) {
      return extractTiptapText(content).replace(/\s+/g, ' ').trim();
    }
  }
  return '';
}

/**
 * Safely compute estimated reading time in minutes
 */
export function getEstimatedReadTime(content) {
  if (!content) return 1;
  const text = typeof content === 'string' ? content : stripHtml(content);
  const wordCount = text.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

/**
 * Safe JSON parser with fallback default
 */
export function safeJsonParse(str, fallback = null) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch (_) {
    return fallback;
  }
}


