'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { publicApi } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { buildImageUrl, timeAgo } from '@/lib/utils';
import { 
  Clock, 
  Flame, 
  Trash2, 
  Shield, 
  ShieldOff, 
  ArrowLeft, 
  Lock, 
  Newspaper,
  Calendar,
  Eye,
  Settings,
  CheckCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

export default function HistoryPage() {
  const { user, loading, openAuthModal, updateTrackingEnabled, refreshUser, subscribe, unsubscribe } = useAuth();
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      loadHistory();
      refreshUser(); // Keep streak and profile up-to-date
    } else {
      setLoadingHistory(false);
    }
  }, [user, refreshUser]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await publicApi.getHistory();
      if (res?.success) {
        setHistory(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load reading history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleToggleTracking = async () => {
    if (!user) return;
    const newStatus = !user.trackingEnabled;
    const res = await updateTrackingEnabled(newStatus);
    if (res?.success) {
      showMessage('success', `History tracking is now ${newStatus ? 'enabled' : 'disabled'}.`);
    } else {
      showMessage('error', res?.message || 'Failed to update tracking preferences.');
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your reading history? This will also reset your category recommendations interest scores.')) {
      return;
    }
    setIsClearing(true);
    try {
      const res = await publicApi.clearHistory();
      if (res?.success) {
        setHistory([]);
        showMessage('success', 'Your reading history and interest profiles have been cleared.');
        await refreshUser();
      } else {
        showMessage('error', 'Failed to clear history.');
      }
    } catch (err) {
      showMessage('error', 'An error occurred while clearing history.');
    } finally {
      setIsClearing(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  if (loading || (loadingHistory && history.length === 0 && user)) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', gap: '16px', color: 'var(--color-text-secondary)'
      }}>
        <div className="spinner" style={{
          width: '40px', height: '40px', border: '3px solid var(--color-border)',
          borderTopColor: 'var(--color-brand)', borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ fontWeight: 500 }}>Loading your profile dashboard...</p>
        <style jsx global>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Auth Required State
  if (!user) {
    return (
      <div style={{
        maxWidth: '500px', margin: '60px auto', padding: '32px',
        backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '16px', boxShadow: 'var(--shadow-lg)', textAlign: 'center'
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '64px', height: '64px', borderRadius: '50%',
          backgroundColor: 'var(--color-brand-light)', color: 'var(--color-brand)',
          marginBottom: '20px'
        }}>
          <Lock size={32} />
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>
          Sign In Required
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
          Accessing your personalized dashboard requires authentication. Sign in to view your reading history, track your daily reading streaks, and customize privacy settings.
        </p>
        <button
          onClick={openAuthModal}
          style={{
            width: '100%', padding: '12px 24px', backgroundColor: 'var(--color-brand)',
            color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 'bold',
            cursor: 'pointer', transition: 'background-color var(--transition-fast)'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-brand-dark)'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--color-brand)'}
        >
          Sign In / Create Account
        </button>
        <div style={{ marginTop: '20px' }}>
          <Link href="/" style={{ color: 'var(--color-text-secondary)', fontSize: '14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={14} /> Back to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 'var(--max-content)', margin: '0 auto', padding: '24px 16px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '36px', height: '36px', borderRadius: '50%',
          border: '1px solid var(--color-border)', color: 'var(--color-text)',
          transition: 'background-color 0.2s'
        }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-alt)'}
           onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-brand)', textTransform: 'uppercase', tracking: 'wide' }}>
            Reader Space
          </span>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', fontWeight: 'bold', lineHeight: 1.2 }}>
            History & Privacy Dashboard
          </h1>
        </div>
      </div>

      {message.text && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px', marginBottom: '20px',
          backgroundColor: message.type === 'success' ? '#def7ec' : '#fde8e8',
          color: message.type === 'success' ? '#03543f' : '#9b1c1c',
          border: `1px solid ${message.type === 'success' ? '#bcf0da' : '#f8b4b4'}`,
          fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px',
          fontWeight: 500
        }}>
          <CheckCircle size={16} />
          {message.text}
        </div>
      )}

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr', gap: '24px',
        '@media (min-width: 768px)': { gridTemplateColumns: '300px 1fr' }
      }} className="history-grid-container">
        
        {/* Sidebar: Profile, Streak & Privacy Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Profile Card & Streak */}
          <div style={{
            backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                backgroundColor: 'var(--color-brand)', color: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', fontSize: '20px'
              }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ fontWeight: 'bold', fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.name}
                </h3>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email}
                </span>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '16px 0' }} />

            {/* Streak Counter */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              backgroundColor: user.readingStreak > 0 ? 'rgba(245, 158, 11, 0.08)' : 'var(--color-bg-alt)',
              border: `1px solid ${user.readingStreak > 0 ? 'rgba(245, 158, 11, 0.2)' : 'var(--color-border)'}`,
              borderRadius: '8px', padding: '16px', marginBottom: '16px'
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '40px', height: '40px', borderRadius: '50%',
                backgroundColor: user.readingStreak > 0 ? 'rgba(245, 158, 11, 0.2)' : 'var(--color-border)',
                color: user.readingStreak > 0 ? '#d97706' : 'var(--color-text-secondary)'
              }}>
                <Flame size={24} fill={user.readingStreak > 0 ? '#d97706' : 'none'} />
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                  Reading Streak
                </span>
                <span style={{ fontSize: '18px', fontWeight: 800, color: user.readingStreak > 0 ? '#d97706' : 'var(--color-text)' }}>
                  {user.readingStreak} {user.readingStreak === 1 ? 'Day' : 'Days'}
                </span>
              </div>
            </div>
            
            {user.readingStreak > 0 && (
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.4, marginBottom: '16px' }}>
                Keep reading an article daily to maintain your streak!
              </p>
            )}

            {/* Mock Subscription Section */}
            <div style={{
              padding: '12px', borderRadius: '8px',
              backgroundColor: user.isPremiumUser ? 'rgba(220, 38, 38, 0.08)' : 'var(--color-bg-alt)',
              border: `1px solid ${user.isPremiumUser ? 'rgba(220, 38, 38, 0.2)' : 'var(--color-border)'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Subscription:</span>
                <span style={{
                  fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase',
                  padding: '2px 8px', borderRadius: '4px',
                  backgroundColor: user.isPremiumUser ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                  color: '#ffffff'
                }}>
                  {user.isPremiumUser ? 'Premium' : 'Free Tier'}
                </span>
              </div>
              
              {!user.isPremiumUser && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  Views: {user.monthlyViewsCount || 0} / 5 free articles
                </div>
              )}

              <button
                onClick={async () => {
                  try {
                    if (user.isPremiumUser) {
                      if (confirm('Cancel your premium subscription?')) {
                        const res = await unsubscribe();
                        if (res?.success) showMessage('success', 'Subscription cancelled.');
                      }
                    } else {
                      const res = await subscribe();
                      if (res?.success) showMessage('success', 'Upgraded to Premium!');
                    }
                  } catch (err) {
                    showMessage('error', 'Action failed');
                  }
                }}
                style={{
                  width: '100%', marginTop: '12px', padding: '8px',
                  backgroundColor: user.isPremiumUser ? 'transparent' : 'var(--color-brand)',
                  color: user.isPremiumUser ? 'var(--color-text)' : '#ffffff',
                  border: user.isPremiumUser ? '1px solid var(--color-border)' : 'none',
                  borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                {user.isPremiumUser ? 'Cancel Premium (Mock)' : 'Upgrade to Premium (Mock)'}
              </button>
            </div>
          </div>

          {/* Privacy Settings Card */}
          <div style={{
            backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={18} /> Privacy Controls
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Tracking Toggle */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>History Tracking</span>
                  <button 
                    onClick={handleToggleTracking}
                    style={{
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      color: user.trackingEnabled ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                      display: 'flex', alignItems: 'center'
                    }}
                    aria-label={user.trackingEnabled ? 'Disable tracking' : 'Enable tracking'}
                  >
                    {user.trackingEnabled ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                  </button>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  When enabled, we record the articles you read to customize your "For You" feed and track daily streaks.
                </p>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

              {/* Clear History */}
              <div>
                <button
                  onClick={handleClearHistory}
                  disabled={isClearing}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    width: '100%', padding: '10px 16px', border: '1px solid #f8b4b4',
                    borderRadius: '8px', color: '#9b1c1c', backgroundColor: 'transparent',
                    fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#fde8e8';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Trash2 size={16} />
                  Clear Reading History
                </button>
                <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '6px', lineHeight: 1.4 }}>
                  Clearing history is permanent and resets your personalized recommendations back to default trending stories.
                </p>
              </div>

            </div>
          </div>

        </div>

        {/* Main Section: History List */}
        <div style={{
          backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)'
        }}>
          <h3 style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} /> Recently Read Articles
          </h3>

          {history.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '48px 16px', color: 'var(--color-text-secondary)',
              border: '2px dashed var(--color-border)', borderRadius: '12px', display: 'flex',
              flexDirection: 'column', alignItems: 'center', gap: '12px'
            }}>
              <Newspaper size={48} style={{ opacity: 0.3 }} />
              <h4 style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--color-text)' }}>
                No reading history found
              </h4>
              <p style={{ fontSize: '13px', maxWidth: '360px', margin: '0 auto', lineHeight: 1.5 }}>
                {user.trackingEnabled 
                  ? "You haven't read any articles yet, or your history was cleared. Start exploring stories on the homepage!"
                  : "Reading history tracking is currently paused. Enable tracking in privacy settings to start logging your reads."
                }
              </p>
              <Link href="/" style={{
                display: 'inline-flex', padding: '8px 16px', backgroundColor: 'var(--color-brand)',
                color: '#ffffff', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold',
                fontSize: '13px', marginTop: '8px'
              }}>
                Browse Articles
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {history.map((article) => {
                const imageUrl = buildImageUrl(article.featuredImage?.url, { width: 150 });
                return (
                  <div 
                    key={article.slug}
                    style={{
                      display: 'flex', gap: '16px', padding: '12px',
                      border: '1px solid var(--color-border)', borderRadius: '8px',
                      transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
                      backgroundColor: 'var(--color-bg-alt)',
                      minHeight: '100px'
                    }}
                    className="history-article-item"
                  >
                    {/* Thumbnail */}
                    <Link href={`/articles/${article.slug}`} style={{ position: 'relative', width: '100px', height: '80px', flexShrink: 0, overflow: 'hidden', borderRadius: '4px', display: 'block' }}>
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={article.title}
                          fill
                          sizes="100px"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'linear-gradient(135deg, var(--color-brand) 0%, #ff7b7b 100%)', color: '#ffffff'
                        }}>
                          <Newspaper size={20} />
                        </div>
                      )}
                    </Link>

                    {/* Article Details */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexGrow: 1, minWidth: 0 }}>
                      <div>
                        {article.category?.name && (
                          <Link href={`/category/${article.category.slug}`} style={{
                            fontSize: '11px', fontWeight: 'bold', color: 'var(--color-brand)',
                            textTransform: 'uppercase', textDecoration: 'none', display: 'inline-block', marginBottom: '4px'
                          }}>
                            {article.category.name}
                          </Link>
                        )}
                        <h4 style={{
                          fontSize: '14px', fontWeight: 'bold', lineHeight: 1.3,
                          margin: 0, display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden'
                        }}>
                          <Link href={`/articles/${article.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                            {article.title}
                          </Link>
                        </h4>
                      </div>
                      
                      {/* Meta */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '8px'
                      }}>
                        {article.publishedAt && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={11} />
                            {new Date(article.publishedAt).toLocaleDateString()}
                          </span>
                        )}
                        {article.views > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Eye size={11} />
                            {article.views.toLocaleString()} views
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      <style jsx>{`
        .history-grid-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        @media (min-width: 768px) {
          .history-grid-container {
            grid-template-columns: 280px 1fr;
          }
        }
        .history-article-item:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
      `}</style>
    </div>
  );
}
