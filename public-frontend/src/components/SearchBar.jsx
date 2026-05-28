'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export default function SearchBar({ defaultValue = '', placeholder = 'Search news...', className = '' }) {
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
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
