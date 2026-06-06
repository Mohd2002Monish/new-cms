'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react';

export default function AudioPlayer({ text }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 1, 1.25, 1.5, 2
  const [supported, setSupported] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  
  const utteranceRef = useRef(null);
  const textOffsetRef = useRef(0);
  const lastCharIndexRef = useRef(0);

  useEffect(() => {
    // Check if SpeechSynthesis is supported in the browser
    if (typeof window !== 'undefined' && !window.speechSynthesis) {
      setSupported(false);
      return;
    }

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Fallback timer when boundaries do not fire frequently
  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            return totalDuration;
          }
          return prev + 0.25 * speed; // Increment in 250ms chunks aligned with speed
        });
      }, 250);
    }
    return () => clearInterval(timer);
  }, [isPlaying, totalDuration, speed]);

  const startSpeaking = (currentSpeed, startIndex = 0) => {
    if (!supported || !text) return;
    
    // Cancel any current speech
    window.speechSynthesis.cancel();

    // Clean html tags from text
    const cleanText = text.replace(/<[^>]*>/g, '').trim();
    if (!cleanText) return;

    // Estimate speaking time: ~150 words per minute at 1x speed
    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
    const fullDuration = ((wordCount / 150) * 60) / currentSpeed;
    setTotalDuration(fullDuration);

    if (startIndex === 0) {
      textOffsetRef.current = 0;
      lastCharIndexRef.current = 0;
      setCurrentTime(0);
    } else {
      textOffsetRef.current = startIndex;
      lastCharIndexRef.current = startIndex;
      const startPct = startIndex / cleanText.length;
      setCurrentTime(startPct * fullDuration);
    }

    const textToSpeak = cleanText.substring(startIndex).trim();
    if (!textToSpeak) {
      setIsPlaying(false);
      setCurrentTime(0);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utteranceRef.current = utterance;
    utterance.rate = currentSpeed;

    // Assign voice
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const allVoices = window.speechSynthesis.getVoices();
      const activeVoice = allVoices.find(v => v.lang.includes('US') || v.lang.includes('GB')) || 
                          allVoices.find(v => v.lang.startsWith('en') || v.lang.startsWith('EN')) || 
                          allVoices[0];
      if (activeVoice) utterance.voice = activeVoice;
    }

    // Listeners
    utterance.onboundary = (e) => {
      if (e.name === 'word') {
        const absoluteIndex = textOffsetRef.current + e.charIndex;
        lastCharIndexRef.current = absoluteIndex;
        const pct = absoluteIndex / cleanText.length;
        setCurrentTime(Math.min(pct * fullDuration, fullDuration));
      }
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      lastCharIndexRef.current = 0;
      textOffsetRef.current = 0;
    };

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted') {
        console.error('Speech synthesis error', e);
        setIsPlaying(false);
      }
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const handlePlay = () => {
    if (!supported || !text) return;

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      return;
    }

    startSpeaking(speed, lastCharIndexRef.current);
  };

  const handlePause = () => {
    if (!supported) return;
    window.speechSynthesis.pause();
    setIsPlaying(false);
  };

  const handleReset = () => {
    startSpeaking(speed, 0);
  };

  const changeSpeed = (newSpeed) => {
    setSpeed(newSpeed);
    if (isPlaying) {
      startSpeaking(newSpeed, lastCharIndexRef.current);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!supported) return null;

  return (
    <div className="audio-player-widget">
      <div className="player-left">
        <button 
          onClick={isPlaying ? handlePause : handlePlay}
          className="play-btn"
          aria-label={isPlaying ? 'Pause reading' : 'Listen to article'}
        >
          {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />}
        </button>
        
        <div className="player-info">
          <span className="player-label">Listen to this article</span>
          
          <div className="time-display-wrapper">
            <span className="time-display">
              {formatTime(currentTime)} / {formatTime(totalDuration)}
            </span>
            <div className="wave-container">
              <div className={`wave-bar ${isPlaying ? 'playing' : ''}`} />
              <div className={`wave-bar ${isPlaying ? 'playing' : ''}`} />
              <div className={`wave-bar ${isPlaying ? 'playing' : ''}`} />
              <div className={`wave-bar ${isPlaying ? 'playing' : ''}`} />
              <div className={`wave-bar ${isPlaying ? 'playing' : ''}`} />
            </div>
          </div>

          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${(currentTime / (totalDuration || 1)) * 100}%` }} 
            />
          </div>
        </div>
      </div>

      <div className="player-controls">
        {isPlaying && (
          <button 
            onClick={handleReset}
            className="control-btn"
            aria-label="Restart reading"
            title="Restart"
          >
            <RotateCcw size={14} />
          </button>
        )}



        <div className="speed-selector">
          <Volume2 size={13} className="volume-icon" />
          <button 
            onClick={() => changeSpeed(1)} 
            className={`speed-btn ${speed === 1 ? 'active' : ''}`}
          >
            1x
          </button>
          <button 
            onClick={() => changeSpeed(1.25)} 
            className={`speed-btn ${speed === 1.25 ? 'active' : ''}`}
          >
            1.25x
          </button>
          <button 
            onClick={() => changeSpeed(1.5)} 
            className={`speed-btn ${speed === 1.5 ? 'active' : ''}`}
          >
            1.5x
          </button>
          <button 
            onClick={() => changeSpeed(2)} 
            className={`speed-btn ${speed === 2 ? 'active' : ''}`}
          >
            2x
          </button>
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
          padding: 12px 16px;
          margin-bottom: 24px;
          font-family: var(--font-inter), sans-serif;
          gap: 16px;
        }

        .player-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .play-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #C0392B;
          color: #ffffff;
          border: none;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s;
          box-shadow: 0 4px 6px -1px rgba(192, 57, 43, 0.25);
          flex-shrink: 0;
        }
        .play-btn:hover {
          background: #a93226;
          transform: scale(1.04);
        }

        .player-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .player-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--color-text, #1e293b);
          text-transform: uppercase;
          letter-spacing: 0.02em;
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
          width: 140px;
          height: 4px;
          background: var(--color-border, #e2e8f0);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: #C0392B;
          transition: width 0.25s linear;
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
          background: #C0392B;
          border-radius: 2px;
          transition: height 0.2s;
        }
        .wave-bar.playing {
          animation: wave-bounce 1s ease-in-out infinite alternate;
        }
        .wave-bar:nth-child(2) { animation-delay: 0.15s; }
        .wave-bar:nth-child(3) { animation-delay: 0.3s; }
        .wave-bar:nth-child(4) { animation-delay: 0.45s; }
        .wave-bar:nth-child(5) { animation-delay: 0.6s; }

        @keyframes wave-bounce {
          from { height: 3px; }
          to { height: 12px; }
        }

        .player-controls {
          display: flex;
          align-items: center;
          gap: 12px;
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
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text-secondary, #64748b);
          outline: none;
          max-width: 140px;
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
        }
        .voice-select:hover {
          border-color: #C0392B;
          color: var(--color-text, #1e293b);
        }

        .speed-selector {
          display: flex;
          align-items: center;
          background: var(--color-bg, #ffffff);
          border: 1px solid var(--color-border, #e2e8f0);
          border-radius: 20px;
          padding: 3px 10px;
          gap: 6px;
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
          border-radius: 12px;
          transition: background 0.2s, color 0.2s;
        }
        .speed-btn:hover {
          color: var(--color-text, #1e293b);
        }
        .speed-btn.active {
          background: var(--color-bg-alt, #f8fafc);
          color: #C0392B;
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
  );
}
