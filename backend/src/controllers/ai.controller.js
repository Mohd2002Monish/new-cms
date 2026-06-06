import { GoogleGenerativeAI } from '@google/generative-ai';

// Simple helper to strip HTML tags
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Local fallback suggesting engine if no Gemini API Key is configured
function generateMockSuggestions(title, content) {
  const cleanText = stripHtml(content);
  const words = cleanText.split(/\s+/).filter(Boolean);
  
  // Create an excerpt
  let excerpt = '';
  if (words.length > 5) {
    excerpt = words.slice(0, 25).join(' ') + '...';
  } else {
    excerpt = `A detailed review of "${title}". Read the full analysis for recent updates and background.`;
  }

  // Find tags based on keywords in title
  const titleWords = title.toLowerCase().split(/[^a-zA-Z]+/);
  const stopWords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'to', 'for', 'in', 'on', 'at', 'with', 'about', 'and', 'but', 'or', 'of']);
  const tagsSet = new Set(['news', 'update']);
  
  titleWords.forEach(w => {
    if (w.length > 3 && !stopWords.has(w)) {
      tagsSet.add(w);
    }
  });

  const tags = Array.from(tagsSet).slice(0, 4);

  // Headline variations
  const headlineVariations = [
    `${title}: What You Need to Know`,
    `Analysis: The Real Story Behind ${title}`,
    `Why ${title} is Dominating the Headlines Today`
  ];

  // SEO
  const seoTitle = `${title.slice(0, 45)} | NewsPortal Latest Updates`;
  const seoDescription = `${title}. Learn more about this developing story, key context, and what it means going forward. Read now on NewsPortal.`;

  return {
    excerpt,
    tags,
    seoTitle,
    seoDescription,
    headlineVariations
  };
}

/**
 * POST /api/admin/ai/suggest
 * Generates editorial suggestions using Google Gemini or a local parser fallback.
 */
export const suggestArticleMetadata = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Article title is required' });
    }

    const hasApiKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';
    const cleanText = stripHtml(content || '');

    if (!hasApiKey) {
      // Return mock suggestions
      console.log('Gemini API Key not set. Falling back to local mock parser.');
      const suggestions = generateMockSuggestions(title, cleanText);
      return res.json({
        success: true,
        data: suggestions,
        isMocked: true
      });
    }

    // Initialize real Gemini client
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
You are an expert editorial AI assistant for a premium news portal.
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
Return ONLY the JSON. Do not include markdown code block formatting (like \`\`\`json).
`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { 
        responseMimeType: 'application/json' 
      }
    });

    const responseText = result.response.text();
    const suggestions = JSON.parse(responseText);

    res.json({
      success: true,
      data: suggestions,
      isMocked: false
    });

  } catch (error) {
    console.error('Gemini API Error:', error);
    // On API failure, try to fallback to mock rather than crashing
    try {
      const { title, content } = req.body;
      const suggestions = generateMockSuggestions(title, stripHtml(content || ''));
      return res.json({
        success: true,
        data: suggestions,
        isMocked: true,
        errorMsg: error.message
      });
    } catch (fallbackError) {
      next(error);
    }
  }
};

/**
 * POST /api/admin/ai/generate-article
 * Researches a topic using Google Gemini websearch grounding and writes a complete news article.
 */
export const generateFullArticle = async (req, res, next) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt/Topic is required' });
    }

    const hasApiKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';

    if (!hasApiKey) {
      // Mock generation fallback
      console.log('Gemini API Key not set. Generating mock article.');
      const title = `Breaking Research: The Emerging Landscape of ${prompt}`;
      const contentHtml = `
        <p>In a developments that has caught both analysts and industry insiders by surprise, <strong>${prompt}</strong> has emerged as a major talking point this week. Leading experts suggest this could represent a pivotal shift in current market dynamics.</p>
        <h2>Key Drivers Behind the Shift</h2>
        <p>Several factors have contributed to the sudden acceleration of interest in this area. Industry reports point to increased research and development budgets, as well as shifting consumer behaviors that favor innovative adaptations.</p>
        <blockquote>"We are witnessing a fundamental restructuring of how we approach these challenges," commented a senior analyst close to the matter. "The speed of adoption is outstripping even our most aggressive models."</blockquote>
        <h2>What Lies Ahead</h2>
        <ul>
          <li>Immediate increase in integration across secondary sectors</li>
          <li>Revised regulatory frameworks to accommodate fast-paced changes</li>
          <li>Substantial venture backing flowing into specialized startups</li>
        </ul>
        <p>As the situation continues to unfold, stakeholders are keeping a close watch on weekly performance indices. For a detailed breakdown of the ongoing impact, stay tuned to our rolling coverage.</p>
      `;

      return res.json({
        success: true,
        data: {
          title,
          contentHtml
        },
        isMocked: true
      });
    }

    // Initialize real Gemini client with web search grounding
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      tools: [{ googleSearch: {} }]
    });

    const promptText = `
You are a senior investigative journalist and news editor.
Perform a web search to research the latest, most accurate, and comprehensive information on this topic:
"${prompt}"

Write a detailed, high-quality, and complete news article about it. 
Return your response in JSON format with these exact keys:
{
  "title": "A captivating, click-worthy news headline.",
  "contentHtml": "The full article body in clean HTML format. Use <h2> for section headers, <p> for paragraphs, <blockquote> for quotes/statistics, and <ul>/<li> for lists of facts. Do NOT wrap in markdown blocks like \`\`\`html."
}
`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      generationConfig: { 
        responseMimeType: 'application/json' 
      }
    });

    const responseText = result.response.text();
    const resultJson = JSON.parse(responseText);

    res.json({
      success: true,
      data: {
        title: resultJson.title,
        contentHtml: resultJson.contentHtml
      },
      isMocked: false
    });

  } catch (error) {
    console.error('Gemini Generate Article Error:', error);
    // Fallback on error
    try {
      const { prompt } = req.body;
      const title = `Latest Developments on ${prompt}`;
      const contentHtml = `
        <p>Research and developments regarding <strong>${prompt}</strong> are accelerating. This article provides key details and structural insights on the topic.</p>
        <h2>Current Developments</h2>
        <p>A review of the landscape shows significant activity. Industry experts are discussing key solutions and next steps.</p>
        <blockquote>"The potential impact here cannot be understated," stated an industry specialist.</blockquote>
      `;
      return res.json({
        success: true,
        data: {
          title,
          contentHtml
        },
        isMocked: true,
        errorMsg: error.message
      });
    } catch (fallbackError) {
      next(error);
    }
  }
};

/**
 * POST /api/admin/ai/edit-article
 * Rewrites/edits the provided HTML article content based on user instructions.
 */
export const editArticle = async (req, res, next) => {
  try {
    const { contentHtml, instruction } = req.body;

    if (!contentHtml) {
      return res.status(400).json({ success: false, message: 'Article content is required' });
    }
    if (!instruction) {
      return res.status(400).json({ success: false, message: 'Instruction is required' });
    }

    const hasApiKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';

    if (!hasApiKey) {
      // Mock editing fallback
      console.log('Gemini API Key not set. Simulating article editing.');
      const contentHtmlEdited = `
        <div class="ai-editor-revision-note" style="padding: 12px; border-left: 4px solid var(--color-brand, #9B8EC7); background: #f8fafc; font-style: italic; margin-bottom: 15px; font-size: 13px; border-radius: 4px;">
          <strong>AI Edit Applied:</strong> "${instruction}" (Demo Mode - Simulated response)
        </div>
        ${contentHtml}
      `;
      return res.json({
        success: true,
        data: {
          contentHtml: contentHtmlEdited
        },
        isMocked: true
      });
    }

    // Initialize real Gemini client
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const promptText = `
You are an expert copyeditor and senior news editor.
Take the following HTML article content:
"${contentHtml}"

Apply this instruction/edit to the article content:
"${instruction}"

Your response must be the rewritten/revised article strictly in HTML format.
Rules:
- Keep the HTML format clean and compatible with Tiptap editor (use <p>, <h2>, <blockquote>, <strong>, <em>, <ul>, <ol>, <li>).
- Do NOT wrap in markdown code blocks like \`\`\`html.
- Return ONLY the clean edited HTML string.
`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: promptText }] }]
    });

    const responseText = result.response.text();
    
    // Clean up any potential markdown wraps
    let cleanResponse = responseText.trim();
    if (cleanResponse.startsWith('```html')) {
      cleanResponse = cleanResponse.replace(/^```html/, '').replace(/```$/, '');
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/^```/, '').replace(/```$/, '');
    }
    cleanResponse = cleanResponse.trim();

    res.json({
      success: true,
      data: {
        contentHtml: cleanResponse
      },
      isMocked: false
    });

  } catch (error) {
    console.error('Gemini Edit Article Error:', error);
    try {
      const { contentHtml, instruction } = req.body;
      const contentHtmlEdited = `
        <p><strong>[AI Revision Note: Applied "${instruction}"]</strong></p>
        ${contentHtml}
      `;
      return res.json({
        success: true,
        data: {
          contentHtml: contentHtmlEdited
        },
        isMocked: true,
        errorMsg: error.message
      });
    } catch (fallbackError) {
      next(error);
    }
  }
};
