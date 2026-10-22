import {
  synthesizeSpeech,
  SUPPORTED_LANGUAGES,
} from '../services/tts.service.js';
import logger from '../services/logger.service.js';

/**
 * POST /api/public/tts/synthesize
 * Synthesize speech for given text in Gujarati, Hindi, or English using Google Free TTS.
 */
export async function synthesizeAudio(req, res) {
  try {
    const { text, language = 'hi', rate = 1.0, articleId } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Text is required for audio synthesis',
      });
    }

    const result = await synthesizeSpeech({
      text,
      language,
      rate: Number(rate) || 1.0,
      articleId,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    logger.error('TTS synthesis error:', err.message);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to synthesize speech',
    });
  }
}

/**
 * GET /api/public/tts/languages
 * Returns supported languages and voice information.
 */
export async function getTtsLanguages(req, res) {
  res.json({
    success: true,
    data: {
      languages: SUPPORTED_LANGUAGES,
      provider: 'google-free-tts',
      supported: true,
    },
  });
}
