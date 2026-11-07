'use client';

import { Volume2 } from 'lucide-react';

const SPEED_OPTIONS = [1, 1.25, 1.5, 2];

/**
 * AudioSpeedSelector — Playback rate toggles (1x, 1.25x, 1.5x, 2x)
 */
export default function AudioSpeedSelector({ speed, onChangeSpeed }) {
  return (
    <div className="speed-selector" role="group" aria-label="Playback speed">
      <Volume2 size={13} className="volume-icon" aria-hidden="true" />
      {SPEED_OPTIONS.map((s) => (
        <button
          key={s}
          onClick={() => onChangeSpeed(s)}
          className={`speed-btn ${speed === s ? 'active' : ''}`}
          title={`Playback speed ${s}x`}
          aria-pressed={speed === s}
        >
          {s}x
        </button>
      ))}
    </div>
  );
}

