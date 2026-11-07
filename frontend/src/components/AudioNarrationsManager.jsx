import React, { useState, useRef } from 'react';
import api from '../services/api.js';

const LANGUAGES = [
  { code: 'hi', label: 'Hindi', flag: '🇮🇳', nativeName: 'हिन्दी' },
  { code: 'en', label: 'English', flag: '🇬🇧', nativeName: 'English' },
  { code: 'gu', label: 'Gujarati', flag: '🇮🇳', nativeName: 'ગુજરાતી' },
];

export default function AudioNarrationsManager({
  audioNarrations = {},
  onChange,
  disabled = false,
  defaultLanguage = 'hi',
}) {
  const [activeLang, setActiveLang] = useState(defaultLanguage || 'hi');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [manualUrl, setManualUrl] = useState('');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const currentAudio = audioNarrations?.[activeLang] || { url: '', duration: 0 };

  const handleUpdateLangAudio = (langCode, audioData) => {
    onChange({
      ...audioNarrations,
      [langCode]: audioData,
    });
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|m4a|aac|ogg)$/i.test(file.name)) {
      setError('Please select a valid audio file (.mp3, .wav, .m4a, .aac, .ogg)');
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    setError(null);

    try {
      // 1. Request upload signature from backend
      const signRes = await api.post('/media/sign', {
        folder: 'news-cms/audio',
        fileType: 'audio',
      }).catch(() => null);

      if (signRes?.data?.data?.cloud_name && signRes?.data?.data?.cloud_name !== 'your_cloudinary_cloud_name') {
        const { signature, timestamp, cloud_name, api_key, folder, resourceType = 'video' } = signRes.data.data;

        // 2. Upload directly to Cloudinary
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', api_key);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);
        formData.append('folder', folder);

        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloud_name}/${resourceType}/upload`;

        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', uploadUrl);

          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
              const pct = Math.round((evt.loaded / evt.total) * 90) + 10;
              setUploadProgress(pct);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const res = JSON.parse(xhr.responseText);
              handleUpdateLangAudio(activeLang, {
                url: res.secure_url || res.url,
                publicId: res.public_id,
                duration: Math.round(res.duration || 0),
                fileName: file.name,
              });
              resolve();
            } else {
              reject(new Error(`Cloudinary upload returned status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error uploading audio'));
          xhr.send(formData);
        });
      } else {
        // Fallback: Convert to Data URI so editors are never blocked by missing cloud credentials
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          handleUpdateLangAudio(activeLang, {
            url: loadEvt.target.result,
            publicId: null,
            duration: 0,
            fileName: file.name,
          });
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Audio upload error:', err);
      // Fallback to data URI if cloud upload fails
      try {
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          handleUpdateLangAudio(activeLang, {
            url: loadEvt.target.result,
            publicId: null,
            duration: 0,
            fileName: file.name,
          });
        };
        reader.readAsDataURL(file);
      } catch (_) {
        setError(err.message || 'Audio upload failed');
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApplyManualUrl = () => {
    if (!manualUrl.trim()) return;
    handleUpdateLangAudio(activeLang, {
      url: manualUrl.trim(),
      publicId: null,
      duration: 0,
      fileName: 'Remote audio link',
    });
    setManualUrl('');
    setError(null);
  };

  const handleRemoveAudio = () => {
    handleUpdateLangAudio(activeLang, {
      url: '',
      publicId: null,
      duration: 0,
    });
  };

  const countAudios = LANGUAGES.filter((l) => !!audioNarrations?.[l.code]?.url).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <span>🎙️</span> News Audio Narrations
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload actual news voice recordings for readers. Users will automatically hear the narration matching their selected news language.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
          {countAudios}/3 Audios
        </span>
      </div>

      {/* Language Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-50 rounded-xl mb-4 border border-slate-100">
        {LANGUAGES.map((lang) => {
          const hasAudio = !!audioNarrations?.[lang.code]?.url;
          const isActive = activeLang === lang.code;

          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                setActiveLang(lang.code);
                setError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
              {hasAudio ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="Audio available" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" title="No audio" />
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600 font-medium">
          {error}
        </div>
      )}

      {/* Active Language Audio Manager */}
      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            {LANGUAGES.find((l) => l.code === activeLang)?.label} Audio Recording
          </span>
          {currentAudio.url && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              ✓ Ready for Readers
            </span>
          )}
        </div>

        {currentAudio.url ? (
          <div className="space-y-3">
            <audio
              controls
              src={currentAudio.url}
              className="w-full h-10 rounded-lg outline-none"
            />
            {currentAudio.fileName && (
              <p className="text-xs text-slate-500 truncate">
                File: <span className="font-medium text-slate-700">{currentAudio.fileName}</span>
              </p>
            )}
            {!disabled && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
                >
                  Replace File
                </button>
                <button
                  type="button"
                  onClick={handleRemoveAudio}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                >
                  Remove Audio
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {!disabled && (
              <>
                {/* Upload box */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                    uploading
                      ? 'border-indigo-400 bg-indigo-50/30'
                      : 'border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50'
                  }`}
                >
                  <span className="text-2xl block mb-1">🎵</span>
                  <p className="text-xs font-bold text-slate-700">
                    {uploading ? `Uploading... ${uploadProgress}%` : `Upload ${LANGUAGES.find((l) => l.code === activeLang)?.label} Voice Audio`}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    MP3, M4A, WAV, or AAC (Voice report narration)
                  </p>
                </div>

                {uploading && (
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}

                {/* Direct URL input fallback */}
                <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="Or paste direct audio URL (.mp3)..."
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyManualUrl}
                    disabled={!manualUrl.trim()}
                    className="px-3 py-2 text-xs font-bold rounded-lg bg-slate-800 text-white disabled:opacity-40 hover:bg-slate-900 transition-colors"
                  >
                    Set URL
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
          className="hidden"
        />
      </div>
    </div>
  );
}

