'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search } from 'lucide-react';

const LOCALES = ['en', 'hi', 'gu'];

export default function SearchBar({ defaultValue = '', placeholder = 'Search news...', className = '', lang }) {
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();
  const pathname = usePathname();

  // Locale comes from the prop when provided, otherwise from the URL prefix
  const segment = pathname?.split('/')[1];
  const locale = lang || (LOCALES.includes(segment) ? segment : 'en');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/${locale}/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`search-bar-form ${className}`}>
      <div className="search-bar-inner">
        <Search className="search-bar-icon" size={20} aria-hidden="true" />
        <input
          type="search"
          name="q"
          className="search-bar-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search articles"
        />
        <button type="submit" className="search-bar-submit sr-only">
          Search
        </button>
      </div>
    </form>
  );
}
