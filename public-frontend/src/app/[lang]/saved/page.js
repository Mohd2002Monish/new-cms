'use client';

import { useState, useEffect } from 'react';
import { useBookmarks } from '@/hooks/useBookmarks';
import { publicApi } from '@/lib/api';
import ArticleCard from '@/components/ArticleCard';
import Breadcrumb from '@/components/Breadcrumb';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export default function SavedArticlesPage() {
  const { bookmarks, isLoaded } = useBookmarks();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    if (bookmarks.length === 0) {
      setArticles([]);
      setLoading(false);
      return;
    }

    const fetchSavedArticles = async () => {
      try {
        setLoading(true);
        // The backend `getPublicArticles` endpoint supports `slugs` parameter natively
        const res = await publicApi.getArticles({ slugs: bookmarks.join(',') });
        if (res?.success) {
          // Sort results to match the order they were bookmarked (most recent first)
          const fetchedMap = res.data.reduce((acc, article) => {
            acc[article.slug] = article;
            return acc;
          }, {});
          
          const sortedArticles = [...bookmarks]
            .reverse() // show latest bookmark first
            .map(slug => fetchedMap[slug])
            .filter(Boolean); // remove any that might have been deleted on the server
            
          setArticles(sortedArticles);
        }
      } catch (err) {
        console.error('Failed to load saved articles', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedArticles();
  }, [bookmarks, isLoaded]);

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Saved Articles' },
  ];

  return (
    <div className="page-wrapper container">
      <Breadcrumb items={breadcrumbItems} />

      <header className="page-header">
        <h1 className="page-title">Saved Articles</h1>
        <p className="page-subtitle">Your personal reading list.</p>
      </header>

      {!isLoaded || loading ? (
        <div className="text-center py-16 text-slate-500">Loading your saved articles...</div>
      ) : articles.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <BookOpen size={64} opacity={0.3} />
          </div>
          <h2 className="text-2xl font-bold mb-2">No saved articles yet</h2>
          <p className="text-slate-500 mb-6">
            When you find an article you want to read later, tap the bookmark icon to save it here.
          </p>
          <Link href="/" className="btn btn-primary">
            Explore Latest News
          </Link>
        </div>
      ) : (
        <div className="article-grid">
          {articles.map((article) => (
            <ArticleCard key={article._id || article.slug} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
