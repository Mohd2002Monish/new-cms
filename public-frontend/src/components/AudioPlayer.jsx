'use client';

import { useState, useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { publicApi } from '@/lib/api';
import AudioPlayButton from './audio/AudioPlayButton';
import AudioScrubber from './audio/AudioScrubber';
import AudioSpeedSelector from './audio/AudioSpeedSelector';
import AudioLanguageSelector, { LANGUAGE_CONFIGS } from './audio/AudioLanguageSelector';
import AudioPlayerStyles from './audio/AudioPlayerStyles';

/**
 * AudioPlayer — Text-to-Speech audio reader with server TTS & browser fallback
 */
export default function AudioPlayer({ text, language = 'en', articleId = null, title = '' }) {
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

  // Load speed preference from localStorage
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
    } catch (_) {
      // ignore storage error
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

  // Reset playback when text or language changes
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
      if (audioRef.current) audioRef.current.pause();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Web Speech API fallback
  const startWebSpeechFallback = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const plainText = text ? text.replace(/<[^>]+>/g, ' ') : title;
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.rate = speed;

    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find((v) => v.lang.startsWith(selectedLang));
    if (matchedVoice) utterance.voice = matchedVoice;

    utterance.onstart = () => {
      setIsLoading(false);
      setIsPlaying(true);
      setUseFallbackWebSpeech(true);
    };
    utterance.onend = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    utterance.onerror = () => {
      setIsLoading(false);
      setIsPlaying(false);
    };

    fallbackUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handlePlay = async () => {
    if (!text && !title) return;

    if (useFallbackWebSpeech) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPlaying(true);
      } else {
        startWebSpeechFallback();
      }
      return;
    }

    if (audioSrc && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    setIsLoading(true);
    try {
      const cleanSnippet = (text || title).slice(0, 1500).replace(/<[^>]+>/g, ' ');
      const res = await publicApi.getSpeechAudio({
        text: cleanSnippet,
        language: selectedLang,
        articleId,
      });

      if (res?.data?.audioUrl) {
        setAudioSrc(res.data.audioUrl);
        setIsCached(!!res.data.isCached);
        if (audioRef.current) {
          audioRef.current.src = res.data.audioUrl;
          audioRef.current.playbackRate = speed;
          audioRef.current.play();
          setIsPlaying(true);
        }
      } else {
        startWebSpeechFallback();
      }
    } catch (_) {
      startWebSpeechFallback();
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = () => {
    if (useFallbackWebSpeech) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        setIsPlaying(false);
      }
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleReset = () => {
    if (useFallbackWebSpeech) {
      window.speechSynthesis.cancel();
      startWebSpeechFallback();
      return;
    }
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e) => {
    if (!progressBarRef.current || !duration || useFallbackWebSpeech) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = ratio * duration;
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const changeSpeed = (newSpeed) => {
    setSpeed(newSpeed);
    try {
      localStorage.setItem('news-portal-audio-speed', newSpeed.toString());
    } catch (_) {}
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
    if (useFallbackWebSpeech && fallbackUtteranceRef.current) {
      window.speechSynthesis.cancel();
      startWebSpeechFallback();
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const currentLangConfig = LANGUAGE_CONFIGS.find((l) => l.code === selectedLang) || LANGUAGE_CONFIGS[2];
  const listenLabel = isCached
    ? `Listen to Narration (${currentLangConfig.shortLabel})`
    : `Audio Narration (${currentLangConfig.shortLabel})`;

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onCanPlay={() => {
          if (audioRef.current && isPlaying) {
            audioRef.current.playbackRate = speed;
          }
          setIsPlaying(true);
        }}
      />

      <div className="audio-player-widget">
        <div className="player-left">
          <AudioPlayButton
            isPlaying={isPlaying}
            isLoading={isLoading}
            onPlay={handlePlay}
            onPause={handlePause}
          />

          <div className="player-info">
            <span className="player-label">{listenLabel}</span>
            <AudioScrubber
              currentTime={currentTime}
              duration={duration}
              progressPct={progressPct}
              isPlaying={isPlaying}
              onSeek={handleSeek}
              progressBarRef={progressBarRef}
              formatTime={formatTime}
            />
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

          <AudioLanguageSelector
            selectedLang={selectedLang}
            onSelectLang={setSelectedLang}
          />

          <AudioSpeedSelector
            speed={speed}
            onChangeSpeed={changeSpeed}
          />
        </div>

        <AudioPlayerStyles />
      </div>
    </>
  );
}
