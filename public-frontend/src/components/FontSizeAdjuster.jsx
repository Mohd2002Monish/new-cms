'use client';

import { useEffect, useState } from 'react';
import { Type } from 'lucide-react';

export default function FontSizeAdjuster() {
  const [size, setSize] = useState('md'); // sm, md, lg
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('news-portal-font-size');
    if (saved) {
      setSize(saved);
      applySizeClass(saved);
    }
  }, []);

  const applySizeClass = (newSize) => {
    const el = document.getElementById('article-content');
    if (el) {
      el.classList.remove('article-body--sm', 'article-body--md', 'article-body--lg');
      el.classList.add(`article-body--${newSize}`);
    }
  };

  const cycleSize = () => {
    const nextSize = size === 'sm' ? 'md' : size === 'md' ? 'lg' : 'sm';
    setSize(nextSize);
    localStorage.setItem('news-portal-font-size', nextSize);
    applySizeClass(nextSize);
  };

  if (!mounted) return null;

  return (
    <button
      onClick={cycleSize}
      className="font-adjuster-btn"
      aria-label="Adjust font size"
      title={`Current font size: ${size}. Click to change.`}
    >
      <Type size={18} />
      <span className="font-adjuster-indicator">{size.toUpperCase()}</span>
    </button>
  );
}
