'use client';

import { useState, useEffect } from 'react';
import { publicApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { BarChart3, CheckCircle, Vote, AlertCircle } from 'lucide-react';

export default function OpinionPoll({ pollId }) {
  const { openAuthModal } = useAuth();
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!pollId) return;
    loadPoll();
  }, [pollId]);

  const loadPoll = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await publicApi.getPoll(pollId);
      if (res?.success) {
        setPoll(res.data);
      } else {
        setError('Poll not found');
      }
    } catch (err) {
      console.error('Failed to load poll', err);
      setError('Failed to fetch poll');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (optionId) => {
    if (isVoting) return;
    setIsVoting(true);
    setError('');
    try {
      const res = await publicApi.voteInPoll(pollId, optionId);
      if (res?.success) {
        setPoll(res.data);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to submit vote.');
    } finally {
      setIsVoting(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)', display: 'flex', justifyContent: 'center'
      }}>
        <div style={{
          width: '24px', height: '24px', border: '2px solid var(--color-border)',
          borderTopColor: 'var(--color-brand)', borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style jsx>{` @keyframes spin { to { transform: rotate(360deg); } } `}</style>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div style={{
        padding: '20px', borderRadius: '12px', border: '1px solid #f8b4b4',
        backgroundColor: '#fde8e8', color: '#9b1c1c', display: 'flex', alignItems: 'center', gap: '8px',
        fontSize: '13px', fontWeight: 500
      }}>
        <AlertCircle size={16} />
        <span>{error || 'Unable to load opinion poll.'}</span>
      </div>
    );
  }

  const totalVotes = poll.totalVotes || poll.options.reduce((acc, o) => acc + o.votes, 0);

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      padding: '24px',
      margin: '24px 0',
      boxShadow: 'var(--shadow-sm)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Editorial Accent Line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', backgroundColor: 'var(--color-brand)' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <BarChart3 size={16} style={{ color: 'var(--color-brand)' }} />
        <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-brand)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Reader Opinion Poll
        </span>
      </div>

      <h3 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '18px',
        fontWeight: 'bold',
        lineHeight: 1.4,
        marginBottom: '20px',
        color: 'var(--color-text)'
      }}>
        {poll.question}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {poll.options.map(option => {
          const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
          
          if (poll.hasVoted) {
            return (
              <div 
                key={option._id}
                style={{
                  position: 'relative',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-alt)',
                  overflow: 'hidden',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  minHeight: '46px'
                }}
              >
                {/* Visual percentage fill background */}
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, bottom: 0,
                  width: `${percentage}%`,
                  backgroundColor: 'rgba(220, 38, 38, 0.08)',
                  transition: 'width 0.8s cubic-bezier(0.1, 0.8, 0.2, 1)',
                  zIndex: 1
                }} />

                <span style={{ position: 'relative', zIndex: 2, fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', minWidth: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {option.text}
                </span>

                <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-brand)' }}>{percentage}%</span>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>({option.votes.toLocaleString()})</span>
                </div>
              </div>
            );
          }

          return (
            <button
              key={option._id}
              onClick={() => handleVote(option._id)}
              disabled={isVoting}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontSize: '14px',
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-alt)';
                e.currentTarget.style.borderColor = 'var(--color-brand)';
              }}
              onMouseOut={(e) => {
                if (!isVoting) {
                  e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                }
              }}
            >
              <span>{option.text}</span>
              <Vote size={14} style={{ opacity: 0.5 }} />
            </button>
          );
        })}
      </div>

      <div style={{
        marginTop: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        color: 'var(--color-text-secondary)'
      }}>
        <span>Total Votes: {totalVotes.toLocaleString()}</span>
        {poll.hasVoted && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'green', fontWeight: 500 }}>
            <CheckCircle size={12} /> Thank you for voting!
          </span>
        )}
      </div>
    </div>
  );
}
