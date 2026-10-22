import crypto from 'crypto';
import { getCache, setCache } from './cache.service.js';
import { SystemSetting } from '../models/SystemSetting.js';
import logger from './logger.service.js';

// Supported language labels and voices
export const SUPPORTED_LANGUAGES = [
  { code: 'gu', label: 'ગુજરાતી (Gujarati)', flag: '🇬🇺', defaultVoice: 'Google Gujarati' },
  { code: 'hi', label: 'हिन्दी (Hindi)', flag: '🇮🇳', defaultVoice: 'Google Hindi' },
  { code: 'en', label: 'English', flag: '🌐', defaultVoice: 'Google English' },
];

/**
 * Clean article text for clean speech synthesis (remove HTML, URLs, Markdown, special characters)
 */
export function cleanTextForSpeech(rawText) {
  if (!rawText) return '';
  return rawText
    .replace(/<[^>]*>/g, ' ')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[#*_`~>\[\]\(\)\{\}\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Splits text into small sentence/clause fragments safe for Google free TTS (max ~160 chars)
 */
export function splitIntoSpeechChunks(text, maxChars = 160) {
  if (!text) return [];
  if (text.length <= maxChars) return [text];

  // Delimiters include English '.', '?', '!', Hindi/Gujarati full-stop '।', commas, semicolons
  const sentenceRegex = /[^.!?।\n,;]+[.!?।\n,;]+|\S+/g;
  const rawSentences = text.match(sentenceRegex) || [text];

  const chunks = [];
  let currentChunk = '';

  for (const sentence of rawSentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if ((currentChunk + ' ' + trimmed).length > maxChars) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      // If a single sentence exceeds maxChars, split by words
      if (trimmed.length > maxChars) {
        const words = trimmed.split(/\s+/);
        let subChunk = '';
        for (const w of words) {
          if ((subChunk + ' ' + w).length > maxChars) {
            if (subChunk.trim()) chunks.push(subChunk.trim());
            subChunk = w;
          } else {
            subChunk += (subChunk ? ' ' : '') + w;
          }
        }
        currentChunk = subChunk;
      } else {
        currentChunk = trimmed;
      }
    } else {
      currentChunk += (currentChunk ? ' ' : '') + trimmed;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Synthesize speech using Google's free TTS engine (no API key required, 100% free)
 */
async function synthesizeGoogleFree(text, lang = 'hi') {
  const chunks = splitIntoSpeechChunks(text, 160);
  if (chunks.length === 0) {
    throw new Error('No readable text to synthesize');
  }

  // Map language codes
  let tl = 'hi';
  if (lang.startsWith('gu')) tl = 'gu';
  else if (lang.startsWith('en')) tl = 'en';

  const audioBuffers = [];

  // Fetch chunks in batches to be gentle and fast
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${tl}&q=${encodeURIComponent(chunk)}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/',
      },
    });

    if (!response.ok) {
      logger.warn(`Google free TTS chunk ${i + 1}/${chunks.length} failed with status ${response.status}`);
      throw new Error(`Google Free TTS error: HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    audioBuffers.push(Buffer.from(arrayBuffer));
  }

  return Buffer.concat(audioBuffers);
}

/**
 * Main speech synthesis entry point with caching and multi-language support.
 */
export async function synthesizeSpeech({
  text,
  language = 'hi',
  rate = 1.0,
  articleId = null,
}) {
  const cleanText = cleanTextForSpeech(text);
  if (!cleanText) {
    throw new Error('No readable content found for text-to-speech');
  }

  const langCode = (language || 'hi').toLowerCase().slice(0, 2);
  const normalizedLang = ['gu', 'hi', 'en'].includes(langCode) ? langCode : 'hi';

  // Compute deterministic cache key from clean text & language
  const textHash = crypto
    .createHash('md5')
    .update(`${normalizedLang}:${cleanText.slice(0, 5000)}`)
    .digest('hex');
  const cacheKey = `tts:free:${normalizedLang}:${textHash}`;

  // Check cache first (instant return, zero network delay)
  const cached = await getCache(cacheKey);
  if (cached) {
    return {
      audioContent: cached,
      language: normalizedLang,
      cached: true,
      provider: 'google-free-tts',
      textLength: cleanText.length,
    };
  }

  // Synthesize via Google Free Voice Engine
  const mp3Buffer = await synthesizeGoogleFree(cleanText, normalizedLang);
  const base64Audio = `data:audio/mp3;base64,${mp3Buffer.toString('base64')}`;

  // Cache for 7 days (604800 seconds)
  await setCache(cacheKey, base64Audio, 604800);

  return {
    audioContent: base64Audio,
    language: normalizedLang,
    cached: false,
    provider: 'google-free-tts',
    textLength: cleanText.length,
  };
}
