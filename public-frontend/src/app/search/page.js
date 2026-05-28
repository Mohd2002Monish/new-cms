import { Suspense } from 'react';
import SearchBar from '@/components/SearchBar';
import SearchResults from '@/components/SearchResults';

export const metadata = {
  title: 'Search | NewsPortal',
  description: 'Search for articles, news, and analysis on NewsPortal.',
};

export default function SearchPage({ searchParams }) {
  const query = searchParams?.q || '';

  return (
    <div className="search-page">
      <div className="search-page-hero">
        <div className="container">
          <h1 className="search-page-title">Search Results</h1>
          <SearchBar 
            defaultValue={query} 
            placeholder="Search for articles, topics, or keywords..." 
            className="search-page-bar" 
          />
        </div>
      </div>

      <div className="container" style={{ paddingBlock: 'var(--space-8)' }}>
        <Suspense fallback={<div className="search-loading">Searching...</div>}>
          <SearchResults initialParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
