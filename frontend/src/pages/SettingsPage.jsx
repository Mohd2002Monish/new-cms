import { useEffect, useState } from 'react';
import api from '../services/api.js';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' | 'smtp' | 'oauth' | 'gtm'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string } | null
  const [testingAi, setTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null); // { success: boolean, message: string, details?: any } | null
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', text: string }

  // Settings State
  const [smtpForm, setSmtpForm] = useState({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    fromEmail: 'noreply@newscms.com',
    fromName: 'News CMS',
    hasPass: false,
  });

  const [oauthForm, setOauthForm] = useState({
    clientId: '',
    clientSecret: '',
    redirectUri: window.location.origin + '/auth/google/callback',
    enabled: false,
    allowReaderLogin: true,
    allowStaffLogin: false,
    hasSecret: false,
  });

  const [aiForm, setAiForm] = useState({
    activeProvider: 'gemini',
    gemini: {
      apiKey: '',
      model: 'gemini-1.5-flash',
      enabled: true,
      hasKey: false,
    },
    openai: {
      apiKey: '',
      model: 'gpt-4o-mini',
      enabled: true,
      hasKey: false,
    },
  });

  const [gtmForm, setGtmForm] = useState({
    containerId: '',
    enabled: false,
    enablePublicWebsite: true,
    enableAdminPanel: false,
  });

  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [showOauthSecret, setShowOauthSecret] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/settings');
      if (data.data?.smtp) {
        setSmtpForm((prev) => ({
          ...prev,
          ...data.data.smtp,
        }));
      }
      if (data.data?.google_oauth) {
        setOauthForm((prev) => ({
          ...prev,
          ...data.data.google_oauth,
          redirectUri: data.data.google_oauth.redirectUri || window.location.origin + '/auth/google/callback',
        }));
      }
      if (data.data?.ai_config) {
        setAiForm((prev) => ({
          ...prev,
          ...data.data.ai_config,
        }));
      }
      if (data.data?.gtm) {
        setGtmForm((prev) => ({
          ...prev,
          ...data.data.gtm,
        }));
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaveSmtp = async (e) => {
    e.preventDefault();
    setSaving(true);
    setTestResult(null);
    try {
      const payload = { ...smtpForm };
      await api.put('/admin/settings/smtp', payload);
      showToast('success', 'SMTP settings saved and updated successfully!');
      fetchSettings();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to save SMTP settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOauth = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...oauthForm };
      await api.put('/admin/settings/google_oauth', payload);
      showToast('success', 'Google OAuth settings saved and updated successfully!');
      fetchSettings();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to save Google OAuth settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAi = async (e) => {
    e.preventDefault();
    setSaving(true);
    setAiTestResult(null);
    try {
      const payload = { ...aiForm };
      await api.put('/admin/settings/ai_config', payload);
      showToast('success', 'AI Provider settings saved and updated successfully!');
      fetchSettings();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to save AI settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGtm = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cleanContainerId = (gtmForm.containerId || '').trim().toUpperCase();
      if (cleanContainerId && !/^GTM-[A-Z0-9_-]+$/i.test(cleanContainerId)) {
        showToast('error', 'Container ID must start with GTM- followed by letters and numbers (e.g. GTM-N9K7P2Q)');
        setSaving(false);
        return;
      }
      const payload = {
        ...gtmForm,
        containerId: cleanContainerId,
      };
      await api.put('/admin/settings/gtm', payload);
      showToast('success', 'Google Tag Manager settings saved successfully!');
      fetchSettings();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to save Google Tag Manager settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtpConnection = async () => {
    setTestingSmtp(true);
    setTestResult(null);
    try {
      const { data } = await api.post('/admin/settings/test-smtp', {
        host: smtpForm.host,
        port: Number(smtpForm.port),
        secure: Boolean(smtpForm.secure),
        user: smtpForm.user,
        pass: smtpForm.pass,
        fromEmail: smtpForm.fromEmail,
        fromName: smtpForm.fromName,
        toEmail: testEmailRecipient || undefined,
      });
      setTestResult({
        success: true,
        message: data.message || 'SMTP server connection test succeeded!',
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || 'SMTP Connection Test Failed. Check your host and credentials.',
      });
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleTestAiConnection = async () => {
    setTestingAi(true);
    setAiTestResult(null);
    try {
      const provider = aiForm.activeProvider;
      const apiKey = provider === 'openai' ? aiForm.openai?.apiKey : aiForm.gemini?.apiKey;
      const model = provider === 'openai' ? aiForm.openai?.model : aiForm.gemini?.model;

      const { data } = await api.post('/admin/settings/test-ai', {
        provider,
        apiKey: apiKey || undefined,
        model,
      });

      setAiTestResult({
        success: true,
        message: data.message || `Successfully connected to ${provider}!`,
        details: data.data,
      });
    } catch (err) {
      setAiTestResult({
        success: false,
        message: err.response?.data?.message || 'AI Connection Test Failed. Verify your API key.',
      });
    } finally {
      setTestingAi(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('success', 'Copied to clipboard!');
  };

  return (
    <div className="space-y-6 max-w-5xl pb-12">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-semibold transition-all ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System & AI Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Configure Google Gemini, OpenAI, Google OAuth, GTM, and SMTP delivery
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl gap-1">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'ai'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="text-sm">✨</span>
            AI Providers
          </button>
          <button
            onClick={() => setActiveTab('smtp')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'smtp'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            SMTP Email
          </button>
          <button
            onClick={() => setActiveTab('oauth')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'oauth'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Google OAuth
          </button>
          <button
            onClick={() => setActiveTab('gtm')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'gtm'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <svg className="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Tag Manager (GTM)
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center text-slate-400">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm font-semibold">Loading system settings...</p>
        </div>
      ) : activeTab === 'ai' ? (
        /* ─── AI PROVIDER CONFIGURATION TAB ────────────────────────────────────────── */
        <div className="space-y-6">
          <form onSubmit={handleSaveAi} className="space-y-6">
            {/* Active Provider Selector Banner */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Active AI Engine</h2>
                  <p className="text-xs text-slate-500">
                    Choose which AI service powers all newsroom writing, research, metadata, and auto-edits
                  </p>
                </div>
                <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-black rounded-full border border-purple-200 uppercase tracking-wider">
                  Active: {aiForm.activeProvider === 'openai' ? 'OpenAI GPT' : 'Google Gemini'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Gemini Option Card */}
                <div
                  onClick={() => setAiForm({ ...aiForm, activeProvider: 'gemini' })}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition relative ${
                    aiForm.activeProvider === 'gemini'
                      ? 'border-purple-600 bg-purple-50/40 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-lg font-black shadow-xs">
                        G
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">Google Gemini</h3>
                        <p className="text-xs text-slate-500">Multimodal, high speed & generous free tier</p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="activeProvider"
                      checked={aiForm.activeProvider === 'gemini'}
                      onChange={() => setAiForm({ ...aiForm, activeProvider: 'gemini' })}
                      className="w-4 h-4 text-purple-600 mt-1"
                    />
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      Model: {aiForm.gemini.model}
                    </span>
                    {aiForm.gemini.hasKey ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        ● Key Configured
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        ○ Key Missing
                      </span>
                    )}
                  </div>
                </div>

                {/* OpenAI Option Card */}
                <div
                  onClick={() => setAiForm({ ...aiForm, activeProvider: 'openai' })}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition relative ${
                    aiForm.activeProvider === 'openai'
                      ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-white text-lg font-black shadow-xs">
                        O
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">OpenAI (ChatGPT)</h3>
                        <p className="text-xs text-slate-500">Industry standard GPT-4o & GPT-4o-mini</p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="activeProvider"
                      checked={aiForm.activeProvider === 'openai'}
                      onChange={() => setAiForm({ ...aiForm, activeProvider: 'openai' })}
                      className="w-4 h-4 text-emerald-600 mt-1"
                    />
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      Model: {aiForm.openai.model}
                    </span>
                    {aiForm.openai.hasKey ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        ● Key Configured
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        ○ Key Missing
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Provider Detailed Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Google Gemini Card */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                        G
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">Google Gemini API</h3>
                        <p className="text-[11px] text-slate-400">Google AI Studio</p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <span>Enable</span>
                      <input
                        type="checkbox"
                        checked={aiForm.gemini.enabled}
                        onChange={(e) =>
                          setAiForm({
                            ...aiForm,
                            gemini: { ...aiForm.gemini, enabled: e.target.checked },
                          })
                        }
                        className="rounded text-purple-600 w-4 h-4"
                      />
                    </label>
                  </div>

                  <div className="space-y-4 pt-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Gemini API Key
                        </label>
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-purple-600 hover:text-purple-800 underline"
                        >
                          Get Free Key ↗
                        </a>
                      </div>
                      <div className="relative">
                        <input
                          type={showGeminiKey ? 'text' : 'password'}
                          value={aiForm.gemini.apiKey}
                          onChange={(e) =>
                            setAiForm({
                              ...aiForm,
                              gemini: { ...aiForm.gemini, apiKey: e.target.value },
                            })
                          }
                          placeholder={aiForm.gemini.hasKey ? '••••••••••••••••' : 'AIzaSy...'}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowGeminiKey(!showGeminiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                        >
                          {showGeminiKey ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Free tier: 15 RPM, 1M TPM, 1,500 RPD on gemini-1.5-flash
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Gemini Model
                      </label>
                      <select
                        value={aiForm.gemini.model}
                        onChange={(e) =>
                          setAiForm({
                            ...aiForm,
                            gemini: { ...aiForm.gemini, model: e.target.value },
                          })
                        }
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                      >
                        <option value="gemini-1.5-flash">gemini-1.5-flash (Fast & Free Tier)</option>
                        <option value="gemini-1.5-pro">gemini-1.5-pro (Deep Reasoning & Long Articles)</option>
                        <option value="gemini-2.0-flash">gemini-2.0-flash (Next-Gen Experimental)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 text-xs text-slate-500">
                  Used by: Article Drafter, Tiptap Copilot, Headlines, SEO Tags in EN, HI & GU
                </div>
              </div>

              {/* OpenAI Card */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                        O
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">OpenAI API (ChatGPT)</h3>
                        <p className="text-[11px] text-slate-400">OpenAI Platform</p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <span>Enable</span>
                      <input
                        type="checkbox"
                        checked={aiForm.openai.enabled}
                        onChange={(e) =>
                          setAiForm({
                            ...aiForm,
                            openai: { ...aiForm.openai, enabled: e.target.checked },
                          })
                        }
                        className="rounded text-emerald-600 w-4 h-4"
                      />
                    </label>
                  </div>

                  <div className="space-y-4 pt-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          OpenAI API Key
                        </label>
                        <a
                          href="https://platform.openai.com/api-keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 underline"
                        >
                          Get API Key ↗
                        </a>
                      </div>
                      <div className="relative">
                        <input
                          type={showOpenAiKey ? 'text' : 'password'}
                          value={aiForm.openai.apiKey}
                          onChange={(e) =>
                            setAiForm({
                              ...aiForm,
                              openai: { ...aiForm.openai, apiKey: e.target.value },
                            })
                          }
                          placeholder={aiForm.openai.hasKey ? '••••••••••••••••' : 'sk-proj-...'}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOpenAiKey(!showOpenAiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                        >
                          {showOpenAiKey ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Standard OpenAI API key (supports gpt-4o and gpt-4o-mini)
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        OpenAI Model
                      </label>
                      <select
                        value={aiForm.openai.model}
                        onChange={(e) =>
                          setAiForm({
                            ...aiForm,
                            openai: { ...aiForm.openai, model: e.target.value },
                          })
                        }
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                      >
                        <option value="gpt-4o-mini">gpt-4o-mini (Recommended — Fast & Cost-Efficient)</option>
                        <option value="gpt-4o">gpt-4o (Flagship Model — Complex Research)</option>
                        <option value="gpt-3.5-turbo">gpt-3.5-turbo (Legacy Standard)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 text-xs text-slate-500">
                  Alternative provider for news generation with strict structured JSON output
                </div>
              </div>
            </div>

            {/* Test Connection and Save Footer */}
            <div className="bg-slate-50 rounded-3xl border border-slate-200/80 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Verify AI Connection</h4>
                <p className="text-xs text-slate-500">
                  Sends a test prompt to verify credentials and measure response latency
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleTestAiConnection}
                  disabled={testingAi}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition shadow-2xs disabled:opacity-50"
                >
                  {testingAi ? 'Testing Connection...' : `Test ${aiForm.activeProvider === 'openai' ? 'OpenAI' : 'Gemini'}`}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 sm:flex-initial px-6 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-black hover:bg-purple-700 transition shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save AI Configuration'}
                </button>
              </div>
            </div>

            {/* Test Result Display */}
            {aiTestResult && (
              <div
                className={`p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 ${
                  aiTestResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <span className="text-base">{aiTestResult.success ? '✅' : '❌'}</span>
                <div className="flex-1">
                  <p className="font-bold">{aiTestResult.message}</p>
                  {aiTestResult.details && (
                    <div className="mt-2 text-[11px] font-mono bg-white/70 p-2.5 rounded-lg border border-emerald-200/60">
                      <div><strong>Active Provider:</strong> {aiTestResult.details.provider}</div>
                      <div><strong>Model:</strong> {aiTestResult.details.model}</div>
                      <div><strong>Latency:</strong> {aiTestResult.details.durationMs}ms</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>
      ) : activeTab === 'smtp' ? (
        /* ─── SMTP TAB ───────────────────────────────────────────────────────────── */
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-1">Outgoing Mail Configuration</h2>
            <p className="text-xs text-slate-500 mb-6">
              Used for sending reader OTPs, password reset emails, and editorial notification alerts
            </p>

            <form onSubmit={handleSaveSmtp} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={smtpForm.host}
                    onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    value={smtpForm.port}
                    onChange={(e) => setSmtpForm({ ...smtpForm, port: e.target.value })}
                    placeholder="587"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    SMTP Username / Email
                  </label>
                  <input
                    type="text"
                    value={smtpForm.user}
                    onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })}
                    placeholder="user@example.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    SMTP Password / App Password
                  </label>
                  <div className="relative">
                    <input
                      type={showSmtpPass ? 'text' : 'password'}
                      value={smtpForm.pass}
                      onChange={(e) => setSmtpForm({ ...smtpForm, pass: e.target.value })}
                      placeholder={smtpForm.hasPass ? '••••••••••••••••' : 'Enter password'}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPass(!showSmtpPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      {showSmtpPass ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Sender From Email
                  </label>
                  <input
                    type="email"
                    value={smtpForm.fromEmail}
                    onChange={(e) => setSmtpForm({ ...smtpForm, fromEmail: e.target.value })}
                    placeholder="noreply@newscms.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Sender Display Name
                  </label>
                  <input
                    type="text"
                    value={smtpForm.fromName}
                    onChange={(e) => setSmtpForm({ ...smtpForm, fromName: e.target.value })}
                    placeholder="News CMS"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="smtpSecure"
                  checked={smtpForm.secure}
                  onChange={(e) => setSmtpForm({ ...smtpForm, secure: e.target.checked })}
                  className="rounded text-indigo-600 w-4 h-4"
                />
                <label htmlFor="smtpSecure" className="text-xs font-semibold text-slate-700">
                  Use SSL/TLS Secure Socket (Port 465)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save SMTP Settings'}
                </button>
              </div>
            </form>
          </div>

          {/* Test SMTP Connection */}
          <div className="bg-slate-50 rounded-3xl border border-slate-200/80 p-6">
            <h3 className="text-sm font-bold text-slate-800 mb-1">Verify SMTP Connection</h3>
            <p className="text-xs text-slate-500 mb-4">
              Sends an automated test ping to your mail server to confirm connectivity
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={testEmailRecipient}
                onChange={(e) => setTestEmailRecipient(e.target.value)}
                placeholder="Optional test email recipient..."
                className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
              />
              <button
                type="button"
                onClick={handleTestSmtpConnection}
                disabled={testingSmtp}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-xs disabled:opacity-50"
              >
                {testingSmtp ? 'Testing Server...' : 'Send Test Ping'}
              </button>
            </div>

            {testResult && (
              <div
                className={`mt-4 p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <span>{testResult.success ? '✓' : '⚠️'}</span>
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'oauth' ? (
        /* ─── GOOGLE OAUTH TAB ────────────────────────────────────────────────────── */
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Google OAuth Single Sign-On</h2>
                <p className="text-xs text-slate-500">
                  Allow readers and editors to authenticate using their official Google accounts
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <span>Enable Google Sign-In</span>
                <input
                  type="checkbox"
                  checked={oauthForm.enabled}
                  onChange={(e) => setOauthForm({ ...oauthForm, enabled: e.target.checked })}
                  className="rounded text-blue-600 w-4 h-4"
                />
              </label>
            </div>

            <form onSubmit={handleSaveOauth} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Authorized Redirect URI (Copy this to Google Cloud Console)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={oauthForm.redirectUri}
                    readOnly
                    className="flex-1 px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 select-all cursor-default"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(oauthForm.redirectUri)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Google Client ID
                  </label>
                  <input
                    type="text"
                    value={oauthForm.clientId}
                    onChange={(e) => setOauthForm({ ...oauthForm, clientId: e.target.value })}
                    placeholder="your-app-id.apps.googleusercontent.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Google Client Secret
                  </label>
                  <div className="relative">
                    <input
                      type={showOauthSecret ? 'text' : 'password'}
                      value={oauthForm.clientSecret}
                      onChange={(e) => setOauthForm({ ...oauthForm, clientSecret: e.target.value })}
                      placeholder={oauthForm.hasSecret ? '••••••••••••••••' : 'GOCSPX-...'}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOauthSecret(!showOauthSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      {showOauthSecret ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Public Portal Readers</p>
                    <p className="text-[11px] text-slate-500">Allow readers to sign in via Google</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={oauthForm.allowReaderLogin}
                    onChange={(e) => setOauthForm({ ...oauthForm, allowReaderLogin: e.target.checked })}
                    className="rounded text-blue-600 w-4 h-4"
                  />
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Newsroom Staff Login</p>
                    <p className="text-[11px] text-slate-500">Allow editors and staff to sign in via Google</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={oauthForm.allowStaffLogin}
                    onChange={(e) => setOauthForm({ ...oauthForm, allowStaffLogin: e.target.checked })}
                    className="rounded text-blue-600 w-4 h-4"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Google OAuth Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* ─── GOOGLE TAG MANAGER TAB ─────────────────────────────────────────────── */
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Google Tag Manager (GTM)</h2>
                  <p className="text-xs text-slate-500">
                    Deploy GA4, marketing pixels, and analytics events centrally without touching source code
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <span>Enable GTM</span>
                <input
                  type="checkbox"
                  checked={gtmForm.enabled}
                  onChange={(e) => setGtmForm({ ...gtmForm, enabled: e.target.checked })}
                  className="rounded text-indigo-600 w-4 h-4"
                />
              </label>
            </div>

            <form onSubmit={handleSaveGtm} className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    GTM Container ID
                  </label>
                  <a
                    href="https://tagmanager.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    Open Google Tag Manager
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={gtmForm.containerId}
                    onChange={(e) => setGtmForm({ ...gtmForm, containerId: e.target.value.toUpperCase().trim() })}
                    placeholder="GTM-XXXXXXX (e.g. GTM-N9K7P2Q)"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                  />
                  {gtmForm.containerId && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {/^GTM-[A-Z0-9_-]+$/i.test(gtmForm.containerId) ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          ✓ Valid Container Format
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          ⚠️ Must start with GTM-
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Find this Container ID at the top right header of your container in the Google Tag Manager console.
                </p>
              </div>

              {/* Deployment Scope */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                  Target Injections
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Public Reader Website</p>
                      <p className="text-[11px] text-slate-500">Inject GTM tracking for readers on Next.js frontend</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={gtmForm.enablePublicWebsite}
                      onChange={(e) => setGtmForm({ ...gtmForm, enablePublicWebsite: e.target.checked })}
                      className="rounded text-indigo-600 w-4 h-4"
                    />
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Admin CMS Workspace</p>
                      <p className="text-[11px] text-slate-500">Inject GTM inside the internal newsroom dashboard</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={gtmForm.enableAdminPanel}
                      onChange={(e) => setGtmForm({ ...gtmForm, enableAdminPanel: e.target.checked })}
                      className="rounded text-indigo-600 w-4 h-4"
                    />
                  </div>
                </div>
              </div>

              {/* Injection Snippet Preview */}
              <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 text-xs font-mono border border-slate-800">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                    Automatic Runtime Injections
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    gtmForm.enabled && gtmForm.containerId
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {gtmForm.enabled && gtmForm.containerId ? '● Active' : '○ Disabled'}
                  </span>
                </div>
                <div className="space-y-2 text-[11px] text-slate-300">
                  <div>
                    <span className="text-indigo-400">&lt;head&gt;</span>
                    <pre className="text-slate-400 mt-0.5 whitespace-pre-wrap break-all">
                      {`https://www.googletagmanager.com/gtm.js?id=${gtmForm.containerId || 'GTM-XXXXXXX'}`}
                    </pre>
                  </div>
                  <div>
                    <span className="text-indigo-400">&lt;body&gt; (noscript fallback)</span>
                    <pre className="text-slate-400 mt-0.5 whitespace-pre-wrap break-all">
                      {`<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmForm.containerId || 'GTM-XXXXXXX'}" height="0" width="0" style="display:none;visibility:hidden" />`}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Google Tag Manager Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
