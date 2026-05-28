'use client';

import { useEffect, useState } from 'react';

/**
 * ReadingProgressBar — a thin red line at the very top of the viewport
 * that fills as the reader scrolls through the article.
 * Placed inside the article page so it only appears on article routes.
 */
export default function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const scrollable = scrollHeight - clientHeight;
      if (scrollable <= 0) { setProgress(100); return; }
      setProgress(Math.min(100, Math.round((scrollTop / scrollable) * 100)));
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress(); // set initial value
    return () => window.removeEventListener('scroll', updateProgress);
  }, []);

  return (
    <div
      className="reading-progress"
      style={{ width: `${progress}%` }}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Reading progress"
    />
  );
}
