'use client';

/**
 * AudioPlayerStyles — Encapsulated CSS-in-JS styles for the audio narration player
 */
export default function AudioPlayerStyles() {
  return (
    <style jsx global>{`
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
        background: var(--color-brand, #c02626);
        color: #ffffff;
        border: none;
        cursor: pointer;
        transition: transform 0.15s, background-color 0.15s;
        box-shadow: 0 4px 8px -2px rgba(192, 57, 43, 0.35);
        flex-shrink: 0;
      }
      .play-btn:hover:not(:disabled) {
        background: var(--color-brand-dark, #991b1b);
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
        font-variant-numeric: tabular-nums;
      }

      .progress-bar-container {
        width: 100%;
        height: 5px;
        background: var(--color-border, #e2e8f0);
        border-radius: 3px;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        transition: height 0.15s ease;
      }
      .progress-bar-container:hover {
        height: 7px;
      }

      .progress-bar-fill {
        height: 100%;
        width: 100%;
        background: var(--color-brand, #c02626);
        border-radius: 3px;
        transform-origin: left;
        transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
        will-change: transform;
      }

      .wave-container {
        display: flex;
        align-items: center;
        gap: 3px;
        height: 12px;
      }

      .wave-bar {
        width: 2px;
        height: 12px;
        background: var(--color-brand, #c02626);
        border-radius: 2px;
        transform: scaleY(0.25);
        transform-origin: bottom;
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .wave-bar.playing {
        animation: wave-pulse 1.1s cubic-bezier(0.16, 1, 0.3, 1) infinite alternate;
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

      @keyframes wave-pulse {
        from {
          transform: scaleY(0.25);
        }
        to {
          transform: scaleY(1);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .wave-bar.playing {
          animation: none;
          transform: scaleY(0.5);
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
        border-color: var(--color-brand, #c02626);
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
        color: var(--color-brand, #c02626);
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
  );
}

