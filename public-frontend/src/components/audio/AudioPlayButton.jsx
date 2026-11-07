'use client';

import { Play, Pause, Loader2 } from 'lucide-react';

/**
 * AudioPlayButton — Play / Pause / Loading button for audio narration
 */
export default function AudioPlayButton({ isPlaying, isLoading, onPlay, onPause }) {
  return (
    <button
      onClick={isPlaying ? onPause : onPlay}
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
  );
}

