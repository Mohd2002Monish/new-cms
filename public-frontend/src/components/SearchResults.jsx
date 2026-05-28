'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { publicApi } from '@/lib/api';
import ArticleCard from '@/components/ArticleCard';
import { SearchX } from 'lucide-react';

export default function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const page = parseInt(searchParams.get('page')) || 1;

  const [results, setResults] = useState([]);
  const [meta, setMeta] = useState({ query: '', total: 0 });
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  // Fetch categories for the filter
  useEffect(() => {
    publicApi.getCategories().then(res => {
      if (res.data) setCategories(res.data);
    }).catch(console.error);
  }, []);

  // Fetch search results
  useEffect(() => {
    let isMounted = true;
    
    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await publicApi.search({
          q: query,
          category,
          from,
          to,
          page
        });
        if (isMounted && res.success) {
          setResults(res.data);
          setMeta(res.meta);
          setPagination(res.pagination);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // Debounce the fetch if we have a query, else immediate (or empty)
    const timer = setTimeout(() => {
      fetchResults();
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query, category, from, to, page]);

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // reset to page 1 on filter change
    if (key !== 'page') params.delete('page');
    
    router.push(`/search?${params.toString()}`);
  };

  if (!query) {
    return (
      <div className="search-empty">
        <SearchX size={64} className="text-gray-300 mb-4" />
        <h2>What are you looking for?</h2>
        <p>Type a keyword in the search bar above to find articles.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filters & Meta */}
      <div className="search-filters">
        <p className="search-result-count">
          {loading ? 'Searching...' : (
            <><strong>{meta.total}</strong> results for "{meta.query}"</>
          )}
        </p>

        <div className="search-filters-controls">
          <select 
            value={category} 
            onChange={(e) => updateParam('category', e.target.value)}
            className="search-filter-select"
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>

          <input 
            type="date" 
            value={from}
            onChange={(e) => updateParam('from', e.target.value)}
            className="search-filter-date"
            aria-label="Filter from date"
            placeholder="From Date"
          />
          
          <span className="text-gray-400">to</span>

          <input 
            type="date" 
            value={to}
            onChange={(e) => updateParam('to', e.target.value)}
            className="search-filter-date"
            aria-label="Filter to date"
            placeholder="To Date"
          />
        </div>
      </div>

      {/* Results Grid */}
      {results.length > 0 ? (
        <div className="latest-grid">
          {results.map((article, idx) => (
            <ArticleCard key={article.slug} article={article} priority={idx < 4} />
          ))}
        </div>
      ) : !loading && (
        <div className="search-empty">
          <SearchX size={64} className="text-gray-300 mb-4" />
          <h2>No results found</h2>
          <p>We couldn't find anything matching "{query}". Try different keywords or adjust your filters.</p>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="search-pagination mt-12 flex justify-center gap-2">
          <button 
            disabled={page <= 1}
            onClick={() => updateParam('page', page - 1)}
            className="pagination-btn"
          >
            Previous
          </button>
          <span className="flex items-center px-4 text-sm font-medium text-gray-500">
            Page {page} of {pagination.pages}
          </span>
          <button 
            disabled={page >= pagination.pages}
            onClick={() => updateParam('page', page + 1)}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
