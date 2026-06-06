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
import FontSizeAdjuster from './FontSizeAdjuster';
import BookmarkButton from './BookmarkButton';
import Link from 'next/link';
import { Lock, Flame, ShieldAlert, Sparkles, LogIn, ChevronRight } from 'lucide-react';
import { io } from 'socket.io-client';

export default function ArticleContentWrapper({ initialArticle }) {
  const { user, openAuthModal, subscribe } = useAuth();
  const [article, setArticle] = useState(initialArticle);
  const [loading, setLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState(''); // 'premium_login_required', 'premium_subscription_required', 'limit_exceeded'
  const [viewsCount, setViewsCount] = useState(0);
  const [liveUpdates, setLiveUpdates] = useState(article.liveUpdates || []);

  // Sync article state client-side
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

  // Connect to Socket.io for Live Blog updates
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
      console.log('Socket connected to live updates room for article:', article.slug);
      socket.emit('join_article', article.slug);
    });

    socket.on('live_update_added', (data) => {
      if (data.postSlug === article.slug) {
        setLiveUpdates(prev => {
          if (prev.some(upd => upd._id === data.update._id)) return prev;
          return [data.update, ...prev]; // Prepend newest
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

  // ─── Paywall Render State ──────────────────────────────────────────────────
  if (isLocked) {
    return (
      <div style={{ margin: '40px 0' }}>
        <p style={{
          fontSize: '18px', lineHeight: 1.6, color: 'var(--color-text-secondary)',
          fontStyle: 'italic', marginBottom: '32px', borderLeft: '4px solid var(--color-brand)',
          paddingLeft: '16px'
        }}>
          "{article.excerpt}"
        </p>

        <div style={{
          position: 'relative',
          padding: '48px 32px',
          borderRadius: '16px',
          background: 'linear-gradient(145deg, #1e1b4b, #311010)',
          color: '#ffffff',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{
            position: 'absolute', top: '-100px', right: '-100px',
            width: '300px', height: '300px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(220,38,38,0.25) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          
          <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: '580px', margin: '0 auto' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '56px', height: '56px', borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.08)', color: '#f59e0b',
              marginBottom: '20px'
            }}>
              <Lock size={28} />
            </div>

            {lockReason === 'limit_exceeded' ? (
              <>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>
                  You've Hit Your Monthly Limit
                </h2>
                <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: 1.6, marginBottom: '28px' }}>
                  You have read all <strong style={{ color: '#fff' }}>5 free articles</strong> this month. Join NewsPortal Premium to read unlimited stories, sync bookmarks, and hear audio narrations.
                </p>
              </>
            ) : lockReason === 'premium_login_required' ? (
              <>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Sparkles size={22} style={{ color: '#f59e0b' }} /> Premium Exclusive Story
                </h2>
                <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: 1.6, marginBottom: '28px' }}>
                  This in-depth reporting is reserved for registered Premium subscribers. Sign in or create an account to unlock.
                </p>
              </>
            ) : (
              <>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Sparkles size={22} style={{ color: '#f59e0b' }} /> Premium Exclusive Story
                </h2>
                <p style={{ color: '#cbd5e1', fontSize: '15px', lineHeight: 1.6, marginBottom: '28px' }}>
                  Your subscription status is standard. Upgrade to Premium for just $5/month to read all articles instantly.
                </p>
              </>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(!user || lockReason === 'premium_login_required') ? (
                <button
                  onClick={openAuthModal}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    width: '100%', padding: '14px', backgroundColor: 'var(--color-brand)',
                    color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 'bold',
                    cursor: 'pointer', fontSize: '15px', transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-brand-dark)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--color-brand)'}
                >
                  <LogIn size={18} /> Sign In / Sign Up
                </button>
              ) : (
                <button
                  onClick={handleSubscribe}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    width: '100%', padding: '14px', backgroundColor: '#d97706',
                    color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 'bold',
                    cursor: 'pointer', fontSize: '15px', transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#b45309'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#d97706'}
                >
                  <Sparkles size={18} /> Upgrade to Premium (Mock Instant)
                </button>
              )}

              <Link href="/" style={{
                color: '#94a3b8', fontSize: '13px', textDecoration: 'none',
                marginTop: '12px', display: 'inline-block'
              }}>
                Return to home and browse other free stories
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Normal Unlocked Article Body Render ───────────────────────────────────
  return (
    <>
      {/* Audio Player */}
      {article.content && (
        <AudioPlayer text={extractTextFromTiptapJSON(article.content)} />
      )}

      {/* Article body */}
      <TiptapRenderer content={article.content} />

      {/* Live Blog Pulser & Timeline */}
      {article.isLiveBlog && (
        <div style={{ marginTop: '2.5rem', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: 'var(--color-bg-alt)', padding: '12px 16px',
            borderRadius: '8px', borderLeft: '4px solid var(--color-brand)',
            marginBottom: '20px'
          }}>
            <span style={{
              width: '8px', height: '8px', backgroundColor: 'var(--color-brand)',
              borderRadius: '50%', display: 'inline-block',
              animation: 'pulse 1.5s infinite', flexShrink: 0
            }} />
            <span style={{ fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', color: 'var(--color-brand)', letterSpacing: '0.05em' }}>
              Live Coverage: Rolling Updates
            </span>
          </div>

          {liveUpdates.length === 0 ? (
            <p style={{ fontStyle: 'italic', fontSize: '14px', color: 'var(--color-text-secondary)', padding: '0 8px' }}>
              Waiting for live updates from the newsroom...
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '20px' }}>
              <div style={{
                position: 'absolute', left: '6px', top: '10px', bottom: '10px',
                width: '2px', backgroundColor: 'var(--color-border)'
              }} />

              {liveUpdates.map((update) => (
                <div key={update._id || update.publishedAt} style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: '-19px', top: '7px',
                    width: '10px', height: '10px', borderRadius: '50%',
                    backgroundColor: 'var(--color-brand)', border: '2px solid var(--color-bg)'
                  }} />

                  <div style={{
                    backgroundColor: 'var(--color-bg-alt)', border: '1px solid var(--color-border)',
                    borderRadius: '8px', padding: '16px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                      <h4 style={{ fontWeight: 'bold', fontSize: '15px', margin: 0 }}>{update.title}</h4>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                        {new Date(update.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ fontSize: '14px', lineHeight: 1.5, margin: 0, color: 'var(--color-text)' }}>
                      {update.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <style jsx global>{`
            @keyframes pulse {
              0% { transform: scale(0.9); opacity: 1; }
              50% { transform: scale(1.2); opacity: 0.4; }
              100% { transform: scale(0.9); opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {/* Share Buttons */}
      <div style={{ marginTop: '2rem' }}>
        <ShareButtons title={article.title} text={article.excerpt} className="justify-center" />
      </div>

      {/* Tags */}
      {article.tags?.length > 0 && (
        <div className="tags-row" aria-label="Article tags">
          {article.tags.map((tag) => (
            <Link
              key={tag}
              href={`/?tag=${encodeURIComponent(tag)}`}
              className="tag-chip"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {/* Related articles */}
      <RelatedArticles slug={article.slug} categoryName={article.category?.name} />

      {/* Engagement bar & reactions */}
      <div className="article-engagement-bar">
        <ReactionsBar articleSlug={article.slug} />
      </div>
      
      <hr className="article-divider" />
      
      {/* Comments section */}
      <CommentsSection articleSlug={article.slug} />
    </>
  );
}
