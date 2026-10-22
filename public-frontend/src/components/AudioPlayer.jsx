'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, Loader2 } from 'lucide-react';
import { publicApi } from '@/lib/api';

const LANGUAGE_CONFIGS = [
  {
    code: "gu",
    label: "🇮🇳 ગુજરાતી (Gujarati)",
    shortLabel: "GU",
  },
  {
    code: "hi",
    label: "🇮🇳 हिन्दी (Hindi)",
    shortLabel: "HI",
  },
  { code: "en", label: "🌐 English", shortLabel: "EN" },
];

export default function AudioPlayer({ text, language = 'en', articleId = null, title = '' }) {
  // Normalize language prop ('gu', 'hi', 'en')
  const initialLang = (language || 'en').toLowerCase().slice(0, 2);
  const normalizedLang = ['gu', 'hi', 'en'].includes(initialLang) ? initialLang : 'en';

  const [selectedLang, setSelectedLang] = useState(normalizedLang);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioSrc, setAudioSrc] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [useFallbackWebSpeech, setUseFallbackWebSpeech] = useState(false);

  const audioRef = useRef(null);
  const progressBarRef = useRef(null);
  const fallbackUtteranceRef = useRef(null);

  // Load saved speed preference from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('news-portal-audio-speed');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && [0.75, 1, 1.25, 1.5, 2].includes(parsed)) {
          setSpeed(parsed);
          if (audioRef.current) {
            audioRef.current.playbackRate = parsed;
          }
        }
      }
    } catch (e) {
      // ignore storage access error
    }
  }, []);

  // Sync selectedLang if parent changes language
  useEffect(() => {
    if (language) {
      const code = language.toLowerCase().slice(0, 2);
      if (['gu', 'hi', 'en'].includes(code)) {
        setSelectedLang(code);
      }
    }
  }, [language]);

  // When selectedLang or text changes, stop playback and clear loaded audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentTime(0);
    setDuration(0);
    setAudioSrc(null);
    setUseFallbackWebSpeech(false);
  }, [selectedLang, text]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Web Speech fallback for offline/emergency situations
  const startWebSpeechFallback = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/<[^>]*>/g, '').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    fallbackUtteranceRef.current = utterance;
    utterance.rate = speed;

    const allVoices = window.speechSynthesis.getVoices();
    const matchingVoice = allVoices.find((v) => v.lang.startsWith(selectedLang));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
      utterance.lang = matchingVoice.lang;
    } else {
      utterance.lang = selectedLang === 'gu' ? 'gu-IN' : selectedLang === 'hi' ? 'hi-IN' : 'en-US';
    }

    utterance.onend = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted') {
        console.warn('Web speech error:', e);
        setIsPlaying(false);
      }
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setUseFallbackWebSpeech(true);
  };

  const handlePlay = async () => {
    if (!text) return;

    // 1. If Web Speech is already in fallback mode
    if (useFallbackWebSpeech) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          setIsPlaying(true);
        } else {
          startWebSpeechFallback();
        }
      }
      return;
    }

    // 2. If audio is already loaded in the HTML5 player
    if (audioRef.current && audioSrc) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn('Audio play failed:', err);
      }
      return;
    }

    // 3. Fetch synthesized audio using Google Free TTS Model
    setIsLoading(true);
    try {
      const res = await publicApi.synthesizeSpeech({
        text,
        language: selectedLang,
        rate: speed,
        articleId,
      });

      if (res?.success && res?.data?.audioContent) {
        const src = res.data.audioContent;
        setAudioSrc(src);
        setIsCached(Boolean(res.data.cached));

        if (audioRef.current) {
          audioRef.current.src = src;
          audioRef.current.playbackRate = speed;
          await audioRef.current.play();
          setIsPlaying(true);
        }
      } else {
        throw new Error(res?.message || 'Synthesis returned no audio');
      }
    } catch (err) {
      console.warn('Google Free TTS failed, falling back to Web Speech API:', err.message);
      startWebSpeechFallback();
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = () => {
    if (useFallbackWebSpeech) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.pause();
      }
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  };

  const handleReset = () => {
    if (useFallbackWebSpeech) {
      startWebSpeechFallback();
    } else if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration || useFallbackWebSpeech) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(clickX / rect.width, 1));
    const seekTime = pct * duration;
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const changeSpeed = (newSpeed) => {
    setSpeed(newSpeed);
    try {
      localStorage.setItem('news-portal-audio-speed', String(newSpeed));
    } catch (e) {
      // ignore
    }
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
    if (useFallbackWebSpeech && isPlaying) {
      startWebSpeechFallback();
    }
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Localized title
  const listenLabel =
    selectedLang === 'gu'
      ? 'આ લેખ સાંભળો'
      : selectedLang === 'hi'
      ? 'यह समाचार सुनें'
      : 'Listen to this article';

  return (
    <>
      {/* Hidden HTML5 Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
            audioRef.current.playbackRate = speed;
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => {
          if (audioRef.current) {
            audioRef.current.playbackRate = speed;
          }
          setIsPlaying(true);
        }}
      />

      <div className="audio-player-widget">
        <div className="player-left">
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            disabled={isLoading}
            className="play-btn"
            aria-label={isPlaying ? 'Pause reading' : 'Listen to article'}
            title={isPlaying ? 'Pause' : 'Play voice narration'}
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin text-white" />
            ) : isPlaying ? (
              <Pause size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />
            )}
          </button>

          <div className="player-info">
            <span className="player-label">{listenLabel}</span>

            <div className="time-display-wrapper">
              <span className="time-display">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <div className="wave-container">
                <div className={`wave-bar ${isPlaying ? 'playing' : ''}`} />
                <div className={`wave-bar ${isPlaying ? 'playing' : ''}`} />
                <div className={`wave-bar ${isPlaying ? 'playing' : ''}`} />
                <div className={`wave-bar ${isPlaying ? 'playing' : ''}`} />
                <div className={`wave-bar ${isPlaying ? 'playing' : ''}`} />
              </div>
            </div>

            <div
              ref={progressBarRef}
              onClick={handleSeek}
              className="progress-bar-container"
              title="Click to seek"
            >
              <div
                className="progress-bar-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="player-controls">
          {isPlaying && (
            <button
              onClick={handleReset}
              className="control-btn"
              aria-label="Restart narration"
              title="Restart from beginning"
            >
              <RotateCcw size={14} />
            </button>
          )}

          {/* Language Selector */}
          <div className="voice-selector-container">
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
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

          {/* Speed Selector */}
          <div className="speed-selector">
            <Volume2 size={13} className="volume-icon" />
            {[1, 1.25, 1.5, 2].map((s) => (
              <button
                key={s}
                onClick={() => changeSpeed(s)}
                className={`speed-btn ${speed === s ? 'active' : ''}`}
                title={`Playback speed ${s}x`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <style jsx>{`
          .audio-player-widget {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: var(--color-bg-alt, #f8fafc);
            border: 1px solid var(--color-border, #e2e8f0);
            border-radius: 12px;
            padding: 12px 18px;
            margin-bottom: 24px;
            font-family: var(--font-inter), sans-serif;
            gap: 16px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
            transition: border-color 0.2s, background-color 0.2s;
          }

          .player-left {
            display: flex;
            align-items: center;
            gap: 14px;
            flex: 1;
            min-width: 0;
          }

          .play-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: #c0392b;
            color: #ffffff;
            border: none;
            cursor: pointer;
            transition: transform 0.15s, background-color 0.15s;
            box-shadow: 0 4px 8px -2px rgba(192, 57, 43, 0.35);
            flex-shrink: 0;
          }
          .play-btn:hover:not(:disabled) {
            background: #a93226;
            transform: scale(1.05);
          }
          .play-btn:disabled {
            opacity: 0.8;
            cursor: wait;
          }

          .player-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
            flex: 1;
            min-width: 0;
          }

          .player-label {
            font-size: 12px;
            font-weight: 700;
            color: var(--color-text, #1e293b);
            letter-spacing: 0.01em;
          }

          .time-display-wrapper {
            display: flex;
            align-items: center;
            gap: 8px;
            height: 14px;
          }

          .time-display {
            font-size: 10px;
            font-weight: 700;
            color: var(--color-text-secondary, #64748b);
            font-family: monospace;
          }

          .progress-bar-container {
            width: 100%;
            max-width: 220px;
            height: 5px;
            background: var(--color-border, #e2e8f0);
            border-radius: 3px;
            overflow: hidden;
            cursor: pointer;
            position: relative;
          }
          .progress-bar-container:hover {
            height: 7px;
          }

          .progress-bar-fill {
            height: 100%;
            background: #c0392b;
            border-radius: 3px;
            transition: width 0.15s linear;
          }

          .wave-container {
            display: flex;
            align-items: center;
            gap: 3px;
            height: 12px;
          }

          .wave-bar {
            width: 2px;
            height: 3px;
            background: #c0392b;
            border-radius: 2px;
            transition: height 0.2s;
          }
          .wave-bar.playing {
            animation: wave-bounce 1s ease-in-out infinite alternate;
          }
          .wave-bar:nth-child(2) {
            animation-delay: 0.15s;
          }
          .wave-bar:nth-child(3) {
            animation-delay: 0.3s;
          }
          .wave-bar:nth-child(4) {
            animation-delay: 0.45s;
          }
          .wave-bar:nth-child(5) {
            animation-delay: 0.6s;
          }

          @keyframes wave-bounce {
            from {
              height: 3px;
            }
            to {
              height: 12px;
            }
          }

          .player-controls {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-shrink: 0;
          }

          .control-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            color: var(--color-text-secondary, #64748b);
            cursor: pointer;
            padding: 6px;
            border-radius: 6px;
            transition: background 0.2s, color 0.2s;
          }
          .control-btn:hover {
            background: var(--color-border, #e2e8f0);
            color: var(--color-text, #1e293b);
          }

          .voice-selector-container {
            display: flex;
            align-items: center;
          }

          .voice-select {
            background: var(--color-bg, #ffffff);
            border: 1px solid var(--color-border, #e2e8f0);
            border-radius: 8px;
            padding: 5px 8px;
            font-size: 11px;
            font-weight: 600;
            color: var(--color-text, #1e293b);
            outline: none;
            cursor: pointer;
            transition: border-color 0.2s;
          }
          .voice-select:hover {
            border-color: #c0392b;
          }

          .speed-selector {
            display: flex;
            align-items: center;
            background: var(--color-bg, #ffffff);
            border: 1px solid var(--color-border, #e2e8f0);
            border-radius: 20px;
            padding: 3px 8px;
            gap: 4px;
          }

          .volume-icon {
            color: var(--color-text-secondary, #64748b);
            margin-right: 2px;
          }

          .speed-btn {
            background: transparent;
            border: none;
            font-size: 11px;
            font-weight: 700;
            color: var(--color-text-secondary, #64748b);
            cursor: pointer;
            padding: 3px 6px;
            border-radius: 10px;
            transition: background 0.15s, color 0.15s;
          }
          .speed-btn:hover {
            color: var(--color-text, #1e293b);
          }
          .speed-btn.active {
            background: var(--color-bg-alt, #f1f5f9);
            color: #c0392b;
          }

          @media (max-width: 768px) {
            .audio-player-widget {
              flex-direction: column;
              align-items: flex-start;
              gap: 12px;
            }
            .player-controls {
              width: 100%;
              justify-content: flex-start;
              flex-wrap: wrap;
            }
          }
        `}</style>
      </div>
    </>
  );
}
