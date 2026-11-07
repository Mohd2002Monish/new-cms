import client from './client';

export const audioApi = {
  /**
   * Request TTS synthesis for an article or summary snippet
   * Returns base64 audio URI data:audio/mp3;base64,...
   */
  async synthesizeAudio({ text, language = 'en', rate = 1.0, articleId = null }) {
    const res = await client.post('/public/tts/synthesize', {
      text,
      language,
      rate,
      articleId,
    });
    return res.data?.data;
  },

  /**
   * Fetch supported languages
   */
  async getLanguages() {
    const res = await client.get('/public/tts/languages');
    return res.data?.data?.languages || [];
  },
};

export default audioApi;

