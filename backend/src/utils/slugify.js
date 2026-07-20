/**
 * Unicode-aware slug generator.
 * Preserves letters/digits from any script (Devanagari, Gujarati, Latin, …),
 * so Hindi/Gujarati titles produce readable native-script slugs.
 */
export const slugify = (text = '') =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

export const SUPPORTED_LANGUAGES = ['en', 'hi', 'gu'];
export const DEFAULT_LANGUAGE = 'en';
