'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { publicApi } from '@/lib/api';
import TiptapRenderer from './TiptapRenderer';
import AudioPlayer from './AudioPlayer';
import ReactionsBar from './ReactionsBar';
import CommentsSection from './CommentsSection';
import RelatedArticles from './RelatedArticles';
import ShareButtons from './ShareButtons';
import PaywallBanner from './article/PaywallBanner';
import LiveBlogTimeline from './article/LiveBlogTimeline';
import ArticleTags from './article/ArticleTags';
import { io } from 'socket.io-client';

/**
 * ArticleContentWrapper — Master coordinator for article body, paywall protection,
 * real-time live blog updates, narration audio, and engagement widgets.
 */
export default function ArticleContentWrapper({ initialArticle }) {
  const { user, openAuthModal, subscribe } = useAuth();
  const [article, setArticle] = useState(initialArticle);
  const [loading, setLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState(''); // 'premium_login_required' | 'limit_exceeded'
  const [, setViewsCount] = useState(0);
  const [liveUpdates, setLiveUpdates] = useState(article.liveUpdates || []);

  // Sync article state and check paywall / monthly reading limits
  useEffect(() => {
    if (user) {
      setLoading(true);
      publicApi.getArticle(article.slug)
        .then((res) => {
          if (res?.success) {
            setArticle(res.data);
            setIsLocked(!!res.data.isLocked);
            setLockReason(res.data.lockReason || '');
            setViewsCount(res.data.monthlyViewsCount || 0);
          }
        })
        .catch((err) => console.error('Failed to sync article state client-side', err))
        .finally(() => setLoading(false));
    } else {
      const guestHistoryKey = 'news-portal-guest-reads';
      try {
        const guestReads = JSON.parse(localStorage.getItem(guestHistoryKey) || '[]');
        
        if (article.isPremium) {
          setIsLocked(true);
          setLockReason('premium_login_required');
        } else {
          const alreadyRead = guestReads.includes(article.slug);
          if (alreadyRead) {
            setIsLocked(false);
            setViewsCount(guestReads.length);
          } else {
            if (guestReads.length >= 5) {
              setIsLocked(true);
              setLockReason('limit_exceeded');
              setViewsCount(guestReads.length);
            } else {
              const updated = [...guestReads, article.slug];
              localStorage.setItem(guestHistoryKey, JSON.stringify(updated));
              setIsLocked(false);
              setViewsCount(updated.length);
            }
          }
        }
      } catch (err) {
        console.error('Local guest limit verification failed', err);
      }
    }
  }, [user, article.slug, article.isPremium]);

  // Sync local updates when article prop refreshes
  useEffect(() => {
    setLiveUpdates(article.liveUpdates || []);
  }, [article.liveUpdates]);

  // Connect to Socket.io for Live Blog rolling updates
  useEffect(() => {
    if (!article.isLiveBlog) return;

    const socketUrl = process.env.NEXT_PUBLIC_API_URL 
      ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '') 
      : 'http://localhost:5000';

    const token = typeof window !== 'undefined' ? localStorage.getItem('reader_token') : null;

    const socket = io(socketUrl, {
      auth: token ? { token } : {},
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      socket.emit('join_article', article.slug);
    });

    socket.on('live_update_added', (data) => {
      if (data.postSlug === article.slug) {
        setLiveUpdates((prev) => {
          if (prev.some((upd) => upd._id === data.update._id)) return prev;
          return [data.update, ...prev];
        });
      }
    });

    return () => {
      socket.emit('leave_article', article.slug);
      socket.disconnect();
    };
  }, [article.isLiveBlog, article.slug]);

  const handleSubscribe = async () => {
    try {
      const res = await subscribe();
      if (res?.success) {
        const resArticle = await publicApi.getArticle(article.slug);
        if (resArticle?.success) {
          setArticle(resArticle.data);
          setIsLocked(false);
          setLockReason('');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  function extractTextFromTiptapJSON(node) {
    if (!node) return '';
    if (node.type === 'text') return node.text || '';
    if (!node.content || !Array.isArray(node.content)) return '';
    return node.content.map(extractTextFromTiptapJSON).join(' ');
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '80px 16px', gap: '16px', color: 'var(--color-text-secondary)'
      }}>
        <div style={{
          width: '32px', height: '32px', border: '2.5px solid var(--color-border)',
          borderTopColor: 'var(--color-brand)', borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ fontSize: '14px', fontWeight: 500 }}>Unlocking story content...</p>
        <style jsx>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // Paywalled View
  if (isLocked) {
    return (
      <PaywallBanner
        excerpt={article.excerpt}
        lockReason={lockReason}
        user={user}
        onOpenAuth={openAuthModal}
        onSubscribe={handleSubscribe}
      />
    );
  }

  // Unlocked Editorial Body View
  return (
    <>
      {/* Audio Narration */}
      {article.content && (
        <AudioPlayer
          text={extractTextFromTiptapJSON(article.content)}
          language={article.language || 'en'}
          articleId={article._id || article.slug}
          title={article.title}
          audioNarrations={article.audioNarrations}
        />
      )}

      {/* Rich Text Body */}
      <TiptapRenderer content={article.content} />

      {/* Live Blog Pulser & Timeline */}
      {article.isLiveBlog && (
        <LiveBlogTimeline liveUpdates={liveUpdates} />
      )}

      {/* Mid-Article Social Sharing */}
      <div style={{ marginTop: '2rem' }}>
        <ShareButtons title={article.title} text={article.excerpt} className="justify-center" />
      </div>

      {/* Tag Taxonomy */}
      <ArticleTags tags={article.tags} />

      {/* Related Stories */}
      <RelatedArticles slug={article.slug} categoryName={article.category?.name} />

      {/* Reader Reactions */}
      <div className="article-engagement-bar">
        <ReactionsBar articleSlug={article.slug} />
      </div>
      
      <hr className="article-divider" />
      
      {/* Comments Conversation */}
      <CommentsSection articleSlug={article.slug} />
    </>
  );
}
