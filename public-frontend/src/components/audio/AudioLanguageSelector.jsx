'use client';

const LANGUAGE_CONFIGS = [
  { code: 'gu', label: '🇮🇳 ગુજરાતી (Gujarati)', shortLabel: 'GU' },
  { code: 'hi', label: '🇮🇳 हिन्दी (Hindi)', shortLabel: 'HI' },
  { code: 'en', label: '🌐 English', shortLabel: 'EN' },
];

/**
 * AudioLanguageSelector — Select narration language (Gujarati, Hindi, English)
 */
export default function AudioLanguageSelector({ selectedLang, onSelectLang }) {
  return (
    <div className="voice-selector-container">
      <select
        value={selectedLang}
        onChange={(e) => onSelectLang(e.target.value)}
        className="voice-select"
        aria-label="Select Voice Language"
      >
        {LANGUAGE_CONFIGS.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export { LANGUAGE_CONFIGS };

