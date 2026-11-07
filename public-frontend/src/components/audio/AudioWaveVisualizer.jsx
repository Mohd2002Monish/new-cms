'use client';

/**
 * AudioWaveVisualizer — Hardware-accelerated 5-bar soundwave equalizer
 */
export default function AudioWaveVisualizer({ isPlaying }) {
  return (
    <div className="wave-container" aria-hidden="true">
      <div className={`wave-bar ${isPlaying ? 'playing' : ''}`} />
      <div className={`wave-bar ${isPlaying ? 'playing' : ''}`} />
      <div className={`wave-bar ${isPlaying ? 'playing' : ''}`} />
      <div className={`wave-bar ${isPlaying ? 'playing' : ''}`} />
      <div className={`wave-bar ${isPlaying ? 'playing' : ''}`} />
    </div>
  );
}

