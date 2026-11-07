'use client';

import AudioWaveVisualizer from './AudioWaveVisualizer';

/**
 * AudioScrubber — Time counter, wave visualizer, and seekable progress track
 */
export default function AudioScrubber({
  currentTime,
  duration,
  progressPct,
  isPlaying,
  onSeek,
  progressBarRef,
  formatTime,
}) {
  return (
    <>
      <div className="time-display-wrapper">
        <span className="time-display">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <AudioWaveVisualizer isPlaying={isPlaying} />
      </div>

      <div
        ref={progressBarRef}
        onClick={onSeek}
        className="progress-bar-container"
        title="Click to seek"
        role="slider"
        aria-label="Audio scrubber"
        aria-valuemin={0}
        aria-valuemax={duration || 100}
        aria-valuenow={currentTime}
      >
        <div
          className="progress-bar-fill"
          style={{ transform: `scaleX(${progressPct / 100})` }}
        />
      </div>
    </>
  );
}

