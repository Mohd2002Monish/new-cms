import { Suspense } from 'react';
import SearchBar from '@/components/SearchBar';
import SearchResults from '@/components/SearchResults';
import { getDictionary } from '@/i18n/dictionaries';

export const metadata = {
  title: 'Search | NewsPortal',
  description: 'Search for articles, news, and analysis on NewsPortal.',
};

export default async function SearchPage({ params, searchParams }) {
  const { lang } = await params;
  const sp = await searchParams;
  const query = sp?.q || '';
  const dict = getDictionary(lang);

  return (
    <div className="search-page">
      <div className="search-page-hero">
        <div className="container">
          <h1 className="search-page-title">{dict.searchResults}</h1>
          <SearchBar
            defaultValue={query}
            placeholder={dict.searchPlaceholder}
            className="search-page-bar"
            lang={lang}
          />
        </div>
      </div>

      <div className="container" style={{ paddingBlock: 'var(--space-8)' }}>
        <Suspense fallback={<div className="search-loading">…</div>}>
          <SearchResults initialParams={sp} lang={lang} />
        </Suspense>
      </div>
    </div>
  );
}
