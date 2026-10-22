import { GoogleGenerativeAI } from '@google/generative-ai';
import { SystemSetting } from '../models/SystemSetting.js';
import logger from './logger.service.js';

const MASKED_SECRET = '••••••••';

/**
 * Retrieve active AI configuration with DB settings prioritized over environment variables.
 */
export async function getAiConfig() {
  let dbConfig = {};
  try {
    const record = await SystemSetting.findOne({ key: 'ai_config' }).lean();
    if (record && record.value && typeof record.value === 'object') {
      dbConfig = record.value;
    }
  } catch (err) {
    logger.warn('Failed to load ai_config from SystemSetting:', err.message);
  }

  const geminiEnvKey = (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here')
    ? process.env.GEMINI_API_KEY.trim()
    : '';

  const openaiEnvKey = (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here')
    ? process.env.OPENAI_API_KEY.trim()
    : '';

  const geminiKey = (dbConfig.gemini?.apiKey && dbConfig.gemini.apiKey !== MASKED_SECRET)
    ? dbConfig.gemini.apiKey.trim()
    : geminiEnvKey;

  const openaiKey = (dbConfig.openai?.apiKey && dbConfig.openai.apiKey !== MASKED_SECRET)
    ? dbConfig.openai.apiKey.trim()
    : openaiEnvKey;

  const activeProvider = dbConfig.activeProvider || (geminiKey ? 'gemini' : openaiKey ? 'openai' : 'gemini');

  return {
    activeProvider: ['gemini', 'openai'].includes(activeProvider) ? activeProvider : 'gemini',
    gemini: {
      apiKey: geminiKey,
      hasKey: Boolean(geminiKey),
      model: dbConfig.gemini?.model || 'gemini-1.5-flash',
      enabled: dbConfig.gemini?.enabled !== undefined ? Boolean(dbConfig.gemini.enabled) : true,
    },
    openai: {
      apiKey: openaiKey,
      hasKey: Boolean(openaiKey),
      model: dbConfig.openai?.model || 'gpt-4o-mini',
      enabled: dbConfig.openai?.enabled !== undefined ? Boolean(dbConfig.openai.enabled) : true,
    },
  };
}

/**
 * Execute completion using Google Gemini
 */
async function callGemini({ apiKey, modelName, systemPrompt, userPrompt, jsonMode }) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelOptions = { model: modelName || 'gemini-1.5-flash' };

  if (systemPrompt) {
    modelOptions.systemInstruction = systemPrompt;
  }

  const model = genAI.getGenerativeModel(modelOptions);

  const generationConfig = {};
  if (jsonMode) {
    generationConfig.responseMimeType = 'application/json';
  }

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig,
  });

  const response = await result.response;
  return response.text();
}

/**
 * Execute completion using OpenAI Chat Completions API
 */
async function callOpenAI({ apiKey, modelName, systemPrompt, userPrompt, jsonMode }) {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: userPrompt });

  const payload = {
    model: modelName || 'gpt-4o-mini',
    messages,
    temperature: 0.7,
  };

  if (jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errBody = await response.text();
    let msg = `OpenAI API HTTP ${response.status}`;
    try {
      const parsed = JSON.parse(errBody);
      msg = parsed.error?.message || msg;
    } catch (e) {
      // ignore
    }
    throw new Error(msg);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  if (!choice || !choice.message?.content) {
    throw new Error('No completion returned by OpenAI API');
  }

  return choice.message.content;
}

/**
 * Unified AI completion generator.
 * Automatically delegates to the active provider (Gemini or OpenAI).
 */
export async function generateAiCompletion({
  systemPrompt = '',
  userPrompt = '',
  jsonMode = false,
  providerOverride = null,
  modelOverride = null,
}) {
  const startTime = Date.now();
  const config = await getAiConfig();

  const provider = providerOverride || config.activeProvider;
  let text = '';
  let activeModel = '';

  if (provider === 'openai') {
    const { apiKey, model, enabled } = config.openai;
    if (!apiKey || !enabled) {
      return {
        hasApiKey: false,
        provider: 'openai',
        message: 'OpenAI API key not configured or provider disabled in Settings.',
      };
    }
    activeModel = modelOverride || model;
    text = await callOpenAI({
      apiKey,
      modelName: activeModel,
      systemPrompt,
      userPrompt,
      jsonMode,
    });
  } else {
    // Default to Gemini
    const { apiKey, model, enabled } = config.gemini;
    if (!apiKey || !enabled) {
      return {
        hasApiKey: false,
        provider: 'gemini',
        message: 'Google Gemini API key not configured or provider disabled in Settings.',
      };
    }
    activeModel = modelOverride || model;
    text = await callGemini({
      apiKey,
      modelName: activeModel,
      systemPrompt,
      userPrompt,
      jsonMode,
    });
  }

  const durationMs = Date.now() - startTime;

  return {
    hasApiKey: true,
    text,
    provider,
    model: activeModel,
    durationMs,
  };
}

/**
 * Test AI provider connection with a short verification prompt.
 */
export async function testAiConnection({ provider = 'gemini', apiKey, model }) {
  const startTime = Date.now();
  let resolvedKey = apiKey;

  // If secret is masked or missing, load from stored config
  if (!resolvedKey || resolvedKey === MASKED_SECRET) {
    const config = await getAiConfig();
    resolvedKey = provider === 'openai' ? config.openai.apiKey : config.gemini.apiKey;
  }

  if (!resolvedKey) {
    throw new Error(`Please provide a valid ${provider === 'openai' ? 'OpenAI' : 'Google Gemini'} API Key to test.`);
  }

  const testSystemPrompt = 'You are a test agent verifying system connectivity. Output JSON only.';
  const testUserPrompt = 'Respond with JSON: {"status": "ok", "message": "Connection successful"}';

  let raw = '';
  if (provider === 'openai') {
    raw = await callOpenAI({
      apiKey: resolvedKey,
      modelName: model || 'gpt-4o-mini',
      systemPrompt: testSystemPrompt,
      userPrompt: testUserPrompt,
      jsonMode: true,
    });
  } else {
    raw = await callGemini({
      apiKey: resolvedKey,
      modelName: model || 'gemini-1.5-flash',
      systemPrompt: testSystemPrompt,
      userPrompt: testUserPrompt,
      jsonMode: true,
    });
  }

  const durationMs = Date.now() - startTime;
  let parsed = { status: 'ok', raw };
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    // fallback
  }

  return {
    success: true,
    provider,
    model: model || (provider === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-flash'),
    durationMs,
    response: parsed,
  };
}
