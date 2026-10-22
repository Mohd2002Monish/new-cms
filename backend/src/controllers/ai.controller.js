import { sanitizeHtml } from '../utils/sanitize.js';
import logger from '../services/logger.service.js';
import PromptHistory from '../models/PromptHistory.js';
import { generateAiCompletion, getAiConfig } from '../services/ai.service.js';

// Human-readable names for prompt instructions
const LANGUAGE_NAMES = { en: 'English', hi: 'Hindi (हिन्दी)', gu: 'Gujarati (ગુજરાતી)' };

const languageInstruction = (language) => {
  const name = LANGUAGE_NAMES[language] || LANGUAGE_NAMES.en;
  return `Write ALL output text in ${name}.`;
};

// Simple helper to strip HTML tags
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Record prompt to both disk file (backend/logs/ai-prompts.log) and MongoDB collection.
 */
async function recordPromptHistory({
  req,
  action,
  prompt,
  instruction = '',
  language = 'en',
  title = '',
  resultSummary = '',
  resultHtml = '',
  suggestions = null,
  isMocked = false,
  durationMs = 0,
  provider = 'gemini',
  model = '',
}) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';

  // 1. Log to structured log file (backend/logs/ai-prompts.log)
  logger.aiPrompt({
    action,
    user: req.user,
    prompt: prompt || instruction,
    language,
    isMocked,
    durationMs,
    metadata: { title, instruction, ipAddress, provider, model },
    preview: resultSummary || title || '',
  });

  // 2. Persist in MongoDB
  if (req.user?._id) {
    PromptHistory.create({
      userId: req.user._id,
      userEmail: req.user.email || '',
      userName: req.user.name || '',
      action,
      prompt: prompt || instruction || 'Untitled prompt',
      instruction,
      language,
      title,
      resultSummary,
      resultHtml,
      suggestions,
      isMocked,
      durationMs,
      provider,
      model,
      ipAddress,
    }).catch((err) => {
      logger.error('Failed to save PromptHistory in MongoDB:', err);
    });
  }
}

// Local fallback suggesting engine if no AI API Key is configured
function generateMockSuggestions(title, content) {
  const cleanText = stripHtml(content);
  const words = cleanText.split(/\s+/).filter(Boolean);

  let excerpt = '';
  if (words.length > 5) {
    excerpt = words.slice(0, 25).join(' ') + '...';
  } else {
    excerpt = `A detailed review of "${title}". Read the full analysis for recent updates and background.`;
  }

  const titleWords = title.toLowerCase().split(/[^a-zA-Z]+/);
  const stopWords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'to', 'for', 'in', 'on', 'at', 'with', 'about', 'and', 'but', 'or', 'of']);
  const tagsSet = new Set(['news', 'update']);

  titleWords.forEach((w) => {
    if (w.length > 3 && !stopWords.has(w)) {
      tagsSet.add(w);
    }
  });

  const tags = Array.from(tagsSet).slice(0, 4);

  const headlineVariations = [
    `${title}: What You Need to Know`,
    `Analysis: The Real Story Behind ${title}`,
    `Why ${title} is Dominating the Headlines Today`,
  ];

  const seoTitle = `${title.slice(0, 45)} | NewsPortal Latest Updates`;
  const seoDescription = `${title}. Learn more about this developing story, key context, and what it means going forward. Read now on NewsPortal.`;

  return {
    excerpt,
    tags,
    seoTitle,
    seoDescription,
    headlineVariations,
  };
}

/**
 * POST /api/admin/ai/suggest
 * Generates editorial suggestions using the active configured AI (Gemini or OpenAI) with mock fallback.
 */
export const suggestArticleMetadata = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { title, content } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Article title is required' });
    }

    const cleanText = stripHtml(content || '');
    const systemPrompt = `You are an expert editorial AI assistant for a premium news portal. ${languageInstruction(
      req.body.language
    )}`;

    const userPrompt = `
Analyze the following article draft:
Title: "${title}"
Content: "${cleanText.slice(0, 8000)}"

Generate the following suggestions for the editor in JSON format:
{
  "excerpt": "A compelling 2-3 sentence summary suitable for search snippets and article cards.",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "seoTitle": "A click-worthy, SEO-optimized title under 60 characters.",
  "seoDescription": "A compelling meta description under 160 characters designed to drive clicks from search engines.",
  "headlineVariations": [
    "A catchy and dramatic headline alternative",
    "A direct and informative headline alternative",
    "An intriguing, question-based or hook headline alternative"
  ]
}
Return ONLY valid JSON.
`;

    const aiRes = await generateAiCompletion({
      systemPrompt,
      userPrompt,
      jsonMode: true,
    });

    if (!aiRes.hasApiKey) {
      // Mock suggestions fallback
      const suggestions = generateMockSuggestions(title, cleanText);
      const durationMs = Date.now() - startTime;

      recordPromptHistory({
        req,
        action: 'suggest-metadata',
        prompt: `Suggest metadata for: "${title}"`,
        language: req.body.language || 'en',
        title,
        resultSummary: suggestions.excerpt,
        suggestions,
        isMocked: true,
        durationMs,
        provider: aiRes.provider,
      });

      return res.json({
        success: true,
        data: suggestions,
        isMocked: true,
        provider: aiRes.provider,
        notice: aiRes.message,
      });
    }

    // Parse JSON
    let cleanJsonStr = aiRes.text.trim();
    if (cleanJsonStr.startsWith('```json')) {
      cleanJsonStr = cleanJsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleanJsonStr.startsWith('```')) {
      cleanJsonStr = cleanJsonStr.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const suggestions = JSON.parse(cleanJsonStr);
    const durationMs = Date.now() - startTime;

    recordPromptHistory({
      req,
      action: 'suggest-metadata',
      prompt: `Suggest metadata for: "${title}"`,
      language: req.body.language || 'en',
      title,
      resultSummary: suggestions.excerpt,
      suggestions,
      isMocked: false,
      durationMs,
      provider: aiRes.provider,
      model: aiRes.model,
    });

    res.json({
      success: true,
      data: suggestions,
      isMocked: false,
      provider: aiRes.provider,
      model: aiRes.model,
    });
  } catch (error) {
    console.error('AI Suggest Error:', error);
    const durationMs = Date.now() - startTime;
    try {
      const { title, content } = req.body;
      const suggestions = generateMockSuggestions(title, stripHtml(content || ''));

      recordPromptHistory({
        req,
        action: 'suggest-metadata',
        prompt: `Suggest metadata for: "${title}" (Fallback)`,
        language: req.body.language || 'en',
        title,
        resultSummary: suggestions.excerpt,
        suggestions,
        isMocked: true,
        durationMs,
      });

      return res.json({
        success: true,
        data: suggestions,
        isMocked: true,
        errorMsg: error.message,
      });
    } catch (fallbackError) {
      next(error);
    }
  }
};

/**
 * POST /api/admin/ai/generate-article
 * Researches a topic and writes a complete news article using the active AI provider.
 */
export const generateFullArticle = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt/Topic is required' });
    }

    const systemPrompt = `You are a senior investigative journalist and news editor. ${languageInstruction(
      req.body.language
    )}`;

    const userPrompt = `
Write a detailed, high-quality, comprehensive news article about:
"${prompt}"

Return your response in JSON format with these exact keys:
{
  "title": "A captivating, click-worthy news headline.",
  "contentHtml": "The full article body in clean HTML format. Use <h2> for section headers, <p> for paragraphs, <blockquote> for quotes/statistics, and <ul>/<li> for lists of facts. Do NOT wrap in markdown blocks like \`\`\`html."
}
Return ONLY valid JSON.
`;

    const aiRes = await generateAiCompletion({
      systemPrompt,
      userPrompt,
      jsonMode: true,
    });

    if (!aiRes.hasApiKey) {
      // Mock generation fallback
      const title = `Special Report: Developments Regarding ${prompt}`;
      const contentHtml = `
        <p>In a developing story, <strong>${prompt}</strong> has emerged as a key focus area this week. Industry insiders and analysts are observing the situation closely.</p>
        <h2>Key Highlights</h2>
        <p>Several significant factors are shaping the ongoing discussion. Resources are being mobilized to address critical priorities in the field.</p>
        <blockquote>"This marks an important milestone in modern coverage," noted a senior analyst.</blockquote>
        <h2>Strategic Implications</h2>
        <ul>
          <li>Enhanced stakeholder engagement across key sectors</li>
          <li>New policy and technology frameworks under active consideration</li>
          <li>Continued updates expected as new data emerges</li>
        </ul>
        <p>For more updates and comprehensive analysis on this story, follow our ongoing news coverage.</p>
      `;

      const durationMs = Date.now() - startTime;
      recordPromptHistory({
        req,
        action: 'generate-article',
        prompt,
        language: req.body.language || 'en',
        title,
        resultSummary: `Mock generated article for "${prompt}"`,
        resultHtml: contentHtml,
        isMocked: true,
        durationMs,
        provider: aiRes.provider,
      });

      return res.json({
        success: true,
        data: {
          title,
          contentHtml,
        },
        isMocked: true,
        provider: aiRes.provider,
        notice: aiRes.message,
      });
    }

    let cleanJsonStr = aiRes.text.trim();
    if (cleanJsonStr.startsWith('```json')) {
      cleanJsonStr = cleanJsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleanJsonStr.startsWith('```')) {
      cleanJsonStr = cleanJsonStr.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const resultJson = JSON.parse(cleanJsonStr);
    const durationMs = Date.now() - startTime;

    recordPromptHistory({
      req,
      action: 'generate-article',
      prompt,
      language: req.body.language || 'en',
      title: resultJson.title,
      resultSummary: `Generated article "${resultJson.title}"`,
      resultHtml: resultJson.contentHtml,
      isMocked: false,
      durationMs,
      provider: aiRes.provider,
      model: aiRes.model,
    });

    res.json({
      success: true,
      data: {
        title: resultJson.title,
        contentHtml: sanitizeHtml(resultJson.contentHtml),
      },
      isMocked: false,
      provider: aiRes.provider,
      model: aiRes.model,
    });
  } catch (error) {
    console.error('AI Generate Article Error:', error);
    const durationMs = Date.now() - startTime;
    try {
      const { prompt } = req.body;
      const title = `Latest Developments on ${prompt}`;
      const contentHtml = `
        <p>Research and reporting regarding <strong>${prompt}</strong> are in progress.</p>
        <h2>Overview</h2>
        <p>Stakeholders are actively evaluating key milestones and policy recommendations.</p>
      `;

      recordPromptHistory({
        req,
        action: 'generate-article',
        prompt,
        language: req.body.language || 'en',
        title,
        resultSummary: `Fallback article for "${prompt}" due to error: ${error.message}`,
        resultHtml: contentHtml,
        isMocked: true,
        durationMs,
      });

      return res.json({
        success: true,
        data: {
          title,
          contentHtml,
        },
        isMocked: true,
        errorMsg: error.message,
      });
    } catch (fallbackError) {
      next(error);
    }
  }
};

/**
 * POST /api/admin/ai/edit-article
 * Rewrites/edits article HTML content based on user instructions.
 */
export const editArticle = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const { contentHtml, instruction } = req.body;

    if (!contentHtml) {
      return res.status(400).json({ success: false, message: 'Article content is required' });
    }
    if (!instruction) {
      return res.status(400).json({ success: false, message: 'Instruction is required' });
    }

    const systemPrompt = `You are an expert copyeditor and senior news editor.
Unless the instruction says otherwise, keep the article in its original language (it may be English, Hindi, or Gujarati).
Rules:
- Keep the HTML format clean and compatible with Tiptap editor (use <p>, <h2>, <blockquote>, <strong>, <em>, <ul>, <ol>, <li>).
- Do NOT wrap in markdown code blocks like \`\`\`html.
- Return ONLY the clean edited HTML string.`;

    const userPrompt = `
Take the following HTML article content:
"${contentHtml}"

Apply this instruction/edit to the article content:
"${instruction}"
`;

    const aiRes = await generateAiCompletion({
      systemPrompt,
      userPrompt,
      jsonMode: false,
    });

    if (!aiRes.hasApiKey) {
      const contentHtmlEdited = `
        <div class="ai-editor-revision-note" style="padding: 12px; border-left: 4px solid var(--color-brand, #9B8EC7); background: #f8fafc; font-style: italic; margin-bottom: 15px; font-size: 13px; border-radius: 4px;">
          <strong>AI Edit Applied:</strong> "${instruction}" (Demo Mode - Simulated response)
        </div>
        ${contentHtml}
      `;

      const durationMs = Date.now() - startTime;
      recordPromptHistory({
        req,
        action: 'edit-article',
        prompt: instruction,
        instruction,
        language: req.body.language || 'en',
        resultSummary: `Mock edit applied: "${instruction}"`,
        resultHtml: contentHtmlEdited,
        isMocked: true,
        durationMs,
        provider: aiRes.provider,
      });

      return res.json({
        success: true,
        data: {
          contentHtml: contentHtmlEdited,
        },
        isMocked: true,
        provider: aiRes.provider,
        notice: aiRes.message,
      });
    }

    let cleanResponse = aiRes.text.trim();
    if (cleanResponse.startsWith('```html')) {
      cleanResponse = cleanResponse.replace(/^```html/, '').replace(/```$/, '');
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/^```/, '').replace(/```$/, '');
    }
    cleanResponse = cleanResponse.trim();
    const finalHtml = sanitizeHtml(cleanResponse);
    const durationMs = Date.now() - startTime;

    recordPromptHistory({
      req,
      action: 'edit-article',
      prompt: instruction,
      instruction,
      language: req.body.language || 'en',
      resultSummary: `Edited article according to: "${instruction}"`,
      resultHtml: finalHtml,
      isMocked: false,
      durationMs,
      provider: aiRes.provider,
      model: aiRes.model,
    });

    res.json({
      success: true,
      data: {
        contentHtml: finalHtml,
      },
      isMocked: false,
      provider: aiRes.provider,
      model: aiRes.model,
    });
  } catch (error) {
    console.error('AI Edit Article Error:', error);
    const durationMs = Date.now() - startTime;
    try {
      const { contentHtml, instruction } = req.body;
      const contentHtmlEdited = `
        <p><strong>[AI Revision Note: Applied "${instruction}"]</strong></p>
        ${contentHtml}
      `;

      recordPromptHistory({
        req,
        action: 'edit-article',
        prompt: instruction,
        instruction,
        language: req.body.language || 'en',
        resultSummary: `Fallback edit for: "${instruction}" due to error: ${error.message}`,
        resultHtml: contentHtmlEdited,
        isMocked: true,
        durationMs,
      });

      return res.json({
        success: true,
        data: {
          contentHtml: contentHtmlEdited,
        },
        isMocked: true,
        errorMsg: error.message,
      });
    } catch (fallbackError) {
      next(error);
    }
  }
};

/**
 * GET /api/admin/ai/prompts
 * Retrieve paginated AI prompt history from MongoDB
 */
export const getPromptHistory = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.user.role === 'editor') {
      filter.userId = req.user._id;
    }
    if (req.query.action) {
      filter.action = req.query.action;
    }
    if (req.query.search) {
      filter.$or = [
        { prompt: { $regex: req.query.search, $options: 'i' } },
        { title: { $regex: req.query.search, $options: 'i' } },
        { userEmail: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [prompts, total] = await Promise.all([
      PromptHistory.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      PromptHistory.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: prompts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};
