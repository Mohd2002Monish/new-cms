'use client';

import Link from 'next/link';
import { Lock, Sparkles, LogIn } from 'lucide-react';

/**
 * PaywallBanner — Displayed when an article is paywalled or reader has exceeded free limit
 */
export default function PaywallBanner({
  excerpt,
  lockReason,
  user,
  onOpenAuth,
  onSubscribe,
}) {
  return (
    <div style={{ margin: '40px 0' }}>
      {excerpt && (
        <blockquote style={{
          fontSize: '19px', lineHeight: 1.65, color: 'var(--color-text)',
          fontFamily: 'var(--font-serif)', fontStyle: 'italic', marginBottom: '32px',
          padding: '24px 28px', backgroundColor: 'var(--color-bg-alt)',
          border: '1px solid var(--color-border)', borderRadius: '8px'
        }}>
          “{excerpt}”
        </blockquote>
      )}

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
                You&apos;ve Hit Your Monthly Limit
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
                onClick={onOpenAuth}
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
                onClick={onSubscribe}
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

