import nodemailer from 'nodemailer';
import Joi from 'joi';
import { SystemSetting } from '../models/SystemSetting.js';
import { env } from '../config/env.js';
import * as audit from '../services/audit.service.js';
import { testAiConnection } from '../services/ai.service.js';

const MASKED_SECRET = '••••••••';

// ─── Validation Schemas ──────────────────────────────────────────────────────

const googleOauthSchema = Joi.object({
  clientId: Joi.string().allow('').default(''),
  clientSecret: Joi.string().allow('').default(''),
  redirectUri: Joi.string().uri({ allowRelative: true }).allow('').default(''),
  enabled: Joi.boolean().default(false),
  allowReaderLogin: Joi.boolean().default(true),
  allowStaffLogin: Joi.boolean().default(false),
});

const smtpSchema = Joi.object({
  host: Joi.string().allow('').default('smtp.gmail.com'),
  port: Joi.number().integer().min(1).max(65535).default(587),
  secure: Joi.boolean().default(false),
  user: Joi.string().allow('').default(''),
  pass: Joi.string().allow('').default(''),
  fromEmail: Joi.string().email().allow('').default('noreply@newscms.com'),
  fromName: Joi.string().allow('').default('News CMS'),
});

const aiConfigSchema = Joi.object({
  activeProvider: Joi.string().valid('gemini', 'openai').default('gemini'),
  gemini: Joi.object({
    apiKey: Joi.string().allow('').default(''),
    model: Joi.string().allow('').default('gemini-1.5-flash'),
    enabled: Joi.boolean().default(true),
  }).default(),
  openai: Joi.object({
    apiKey: Joi.string().allow('').default(''),
    model: Joi.string().allow('').default('gpt-4o-mini'),
    enabled: Joi.boolean().default(true),
  }).default(),
});

const gtmSchema = Joi.object({
  containerId: Joi.string()
    .trim()
    .pattern(/^GTM-[A-Za-z0-9_-]+$/)
    .allow('')
    .default('')
    .messages({
      'string.pattern.base': 'Container ID must match the format GTM-XXXXXXX (e.g. GTM-N9K7P2Q)',
    }),
  enabled: Joi.boolean().default(false),
  enablePublicWebsite: Joi.boolean().default(true),
  enableAdminPanel: Joi.boolean().default(false),
});

const testSmtpSchema = Joi.object({
  host: Joi.string().required(),
  port: Joi.number().integer().required(),
  secure: Joi.boolean().default(false),
  user: Joi.string().required(),
  pass: Joi.string().allow('').optional(),
  fromEmail: Joi.string().email().required(),
  fromName: Joi.string().allow('').default('News CMS Test'),
  toEmail: Joi.string().email().optional().allow(''),
});

const testAiSchema = Joi.object({
  provider: Joi.string().valid('gemini', 'openai').required(),
  apiKey: Joi.string().allow('').optional(),
  model: Joi.string().allow('').optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function maskValue(val) {
  return val ? MASKED_SECRET : '';
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/admin/settings
 * Retrieve Google OAuth, SMTP, and AI configuration settings (with secrets masked)
 */
export const getSettings = async (req, res, next) => {
  try {
    const [oauthSetting, smtpSetting, aiSetting, gtmSetting] = await Promise.all([
      SystemSetting.findOne({ key: 'google_oauth' }).lean(),
      SystemSetting.findOne({ key: 'smtp' }).lean(),
      SystemSetting.findOne({ key: 'ai_config' }).lean(),
      SystemSetting.findOne({ key: 'gtm' }).lean(),
    ]);

    // Google OAuth config with fallback
    const rawOauth = oauthSetting?.value || {};
    const oauth = {
      clientId: rawOauth.clientId || '',
      clientSecret: maskValue(rawOauth.clientSecret),
      hasSecret: Boolean(rawOauth.clientSecret),
      redirectUri: rawOauth.redirectUri || '',
      enabled: Boolean(rawOauth.enabled),
      allowReaderLogin: rawOauth.allowReaderLogin !== undefined ? rawOauth.allowReaderLogin : true,
      allowStaffLogin: rawOauth.allowStaffLogin !== undefined ? rawOauth.allowStaffLogin : false,
      updatedAt: oauthSetting?.updatedAt || null,
    };

    // SMTP config with env fallback
    const rawSmtp = smtpSetting?.value || {};
    const smtp = {
      host: rawSmtp.host || env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(rawSmtp.port || env.SMTP_PORT) || 587,
      secure: rawSmtp.secure !== undefined ? Boolean(rawSmtp.secure) : (Number(rawSmtp.port || env.SMTP_PORT) === 465),
      user: rawSmtp.user || env.SMTP_USER || '',
      pass: maskValue(rawSmtp.pass || env.SMTP_PASS),
      hasPass: Boolean(rawSmtp.pass || env.SMTP_PASS),
      fromEmail: rawSmtp.fromEmail || env.EMAIL_FROM || 'noreply@newscms.com',
      fromName: rawSmtp.fromName || 'News CMS',
      updatedAt: smtpSetting?.updatedAt || null,
    };

    // AI Configuration (Gemini + OpenAI)
    const rawAi = aiSetting?.value || {};
    const geminiEnvKey = (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here')
      ? process.env.GEMINI_API_KEY
      : '';
    const openaiEnvKey = (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here')
      ? process.env.OPENAI_API_KEY
      : '';

    const aiConfig = {
      activeProvider: rawAi.activeProvider || (geminiEnvKey ? 'gemini' : openaiEnvKey ? 'openai' : 'gemini'),
      gemini: {
        apiKey: maskValue(rawAi.gemini?.apiKey || geminiEnvKey),
        hasKey: Boolean(rawAi.gemini?.apiKey || geminiEnvKey),
        model: rawAi.gemini?.model || 'gemini-1.5-flash',
        enabled: rawAi.gemini?.enabled !== undefined ? Boolean(rawAi.gemini.enabled) : true,
      },
      openai: {
        apiKey: maskValue(rawAi.openai?.apiKey || openaiEnvKey),
        hasKey: Boolean(rawAi.openai?.apiKey || openaiEnvKey),
        model: rawAi.openai?.model || 'gpt-4o-mini',
        enabled: rawAi.openai?.enabled !== undefined ? Boolean(rawAi.openai.enabled) : true,
      },
      updatedAt: aiSetting?.updatedAt || null,
    };

    // Google Tag Manager (GTM)
    const rawGtm = gtmSetting?.value || {};
    const gtm = {
      containerId: rawGtm.containerId || process.env.GTM_CONTAINER_ID || '',
      enabled: Boolean(rawGtm.enabled),
      enablePublicWebsite: rawGtm.enablePublicWebsite !== undefined ? Boolean(rawGtm.enablePublicWebsite) : true,
      enableAdminPanel: Boolean(rawGtm.enableAdminPanel),
      updatedAt: gtmSetting?.updatedAt || null,
    };

    res.json({
      success: true,
      data: {
        google_oauth: oauth,
        smtp,
        ai_config: aiConfig,
        gtm,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/settings/:key
 * Update Google OAuth, SMTP, or AI configuration
 */
export const updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    if (!['google_oauth', 'smtp', 'ai_config', 'gtm'].includes(key)) {
      return res.status(400).json({ success: false, message: 'Invalid settings key. Must be google_oauth, smtp, ai_config, or gtm' });
    }

    const existing = await SystemSetting.findOne({ key });
    let validatedValue = {};
    let group = 'general';

    if (key === 'google_oauth') {
      const { error, value } = googleOauthSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
      }
      validatedValue = { ...value };
      if (!validatedValue.clientSecret || validatedValue.clientSecret === MASKED_SECRET) {
        validatedValue.clientSecret = existing?.value?.clientSecret || '';
      }
      group = 'oauth';
    } else if (key === 'smtp') {
      const { error, value } = smtpSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
      }
      validatedValue = { ...value };
      if (!validatedValue.pass || validatedValue.pass === MASKED_SECRET) {
        validatedValue.pass = existing?.value?.pass || env.SMTP_PASS || '';
      }
      group = 'email';
    } else if (key === 'ai_config') {
      const { error, value } = aiConfigSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
      }
      validatedValue = { ...value };

      // Preserve existing Gemini key if masked
      if (!validatedValue.gemini?.apiKey || validatedValue.gemini?.apiKey === MASKED_SECRET) {
        validatedValue.gemini.apiKey = existing?.value?.gemini?.apiKey || process.env.GEMINI_API_KEY || '';
      }

      // Preserve existing OpenAI key if masked
      if (!validatedValue.openai?.apiKey || validatedValue.openai?.apiKey === MASKED_SECRET) {
        validatedValue.openai.apiKey = existing?.value?.openai?.apiKey || process.env.OPENAI_API_KEY || '';
      }
      group = 'ai';
    } else if (key === 'gtm') {
      const { error, value } = gtmSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
      }
      validatedValue = {
        ...value,
        containerId: (value.containerId || '').toUpperCase().trim(),
      };
      group = 'analytics';
    }

    const updated = await SystemSetting.findOneAndUpdate(
      { key },
      {
        key,
        group,
        value: validatedValue,
        description:
          key === 'google_oauth'
            ? 'Google OAuth Client credentials'
            : key === 'smtp'
            ? 'SMTP Server settings for emails and OTPs'
            : key === 'gtm'
            ? 'Google Tag Manager (GTM) container configuration'
            : 'AI Provider configuration (Google Gemini & OpenAI)',
        updatedBy: req.user._id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await audit.log({
      req,
      action: 'SYSTEM_SETTINGS_UPDATED',
      targetType: 'SystemSetting',
      targetId: updated._id,
      targetLabel: key,
      newState: { key, group, activeProvider: validatedValue.activeProvider },
    });

    // Return sanitized response
    const sanitized = JSON.parse(JSON.stringify(validatedValue));
    if (key === 'google_oauth') sanitized.clientSecret = maskValue(sanitized.clientSecret);
    if (key === 'smtp') sanitized.pass = maskValue(sanitized.pass);
    if (key === 'ai_config') {
      if (sanitized.gemini) sanitized.gemini.apiKey = maskValue(sanitized.gemini.apiKey);
      if (sanitized.openai) sanitized.openai.apiKey = maskValue(sanitized.openai.apiKey);
    }

    res.json({
      success: true,
      message: `${
        key === 'google_oauth'
          ? 'Google OAuth'
          : key === 'smtp'
          ? 'SMTP'
          : key === 'gtm'
          ? 'Google Tag Manager'
          : 'AI Provider'
      } settings saved successfully`,
      data: sanitized,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/settings/test-smtp
 * Verify SMTP connection and optionally send a test email
 */
export const testSmtp = async (req, res, next) => {
  try {
    const { error, value } = testSmtpSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    let password = value.pass;
    if (!password || password === MASKED_SECRET) {
      const saved = await SystemSetting.findOne({ key: 'smtp' }).lean();
      password = saved?.value?.pass || env.SMTP_PASS;
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'SMTP password is required to test the connection',
      });
    }

    const transporter = nodemailer.createTransport({
      host: value.host,
      port: Number(value.port),
      secure: Boolean(value.secure),
      auth: {
        user: value.user,
        pass: password,
      },
      connectionTimeout: 10000,
    });

    await transporter.verify();

    if (value.toEmail) {
      await transporter.sendMail({
        from: value.fromName ? `"${value.fromName}" <${value.fromEmail}>` : value.fromEmail,
        to: value.toEmail,
        subject: 'News CMS — SMTP Configuration Test',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 16px 20px; border-radius: 8px; color: white; margin-bottom: 20px;">
              <h2 style="margin: 0; font-size: 20px;">SMTP Connection Successful!</h2>
            </div>
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">
              This is a test email sent from your <strong>News CMS</strong> administration panel to confirm that your SMTP email server settings are working properly.
            </p>
          </div>
        `,
      });
    }

    res.json({
      success: true,
      message: value.toEmail
        ? `SMTP connection verified and test email successfully delivered to ${value.toEmail}!`
        : 'SMTP connection verified successfully!',
    });
  } catch (error) {
    console.error('SMTP test connection failed:', error.message);
    res.status(400).json({
      success: false,
      message: `SMTP Connection Failed: ${error.message}`,
    });
  }
};

/**
 * POST /api/admin/settings/test-ai
 * Test Google Gemini or OpenAI connection with credentials
 */
export const testAi = async (req, res, next) => {
  try {
    const { error, value } = testAiSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const result = await testAiConnection(value);

    res.json({
      success: true,
      message: `Successfully connected to ${value.provider === 'openai' ? 'OpenAI' : 'Google Gemini'} (${result.model}) in ${result.durationMs}ms!`,
      data: result,
    });
  } catch (error) {
    console.error('AI test connection failed:', error.message);
    res.status(400).json({
      success: false,
      message: `AI Connection Failed: ${error.message}`,
    });
  }
};
