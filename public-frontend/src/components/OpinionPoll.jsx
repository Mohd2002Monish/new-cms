'use client';

import { useState, useEffect } from 'react';
import { publicApi } from '@/lib/api';
import { BarChart3, CheckCircle, AlertCircle } from 'lucide-react';
import PollOptionButton from './poll/PollOptionButton';
import PollResultBar from './poll/PollResultBar';

/**
 * OpinionPoll — Interactive reader opinion poll with real-time voting and GPU-accelerated results
 */
export default function OpinionPoll({ pollId }) {
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    if (!pollId) return;
    loadPoll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollId]);

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
        <span style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-brand)' }}>
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
        {poll.options.map((option) => {
          const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
          
          if (poll.hasVoted) {
            return (
              <PollResultBar
                key={option._id}
                option={option}
                percentage={percentage}
              />
            );
          }

          return (
            <PollOptionButton
              key={option._id}
              option={option}
              onVote={handleVote}
              disabled={isVoting}
            />
          );
        })}
      </div>

      {poll.hasVoted && (
        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-light)' }}>
          <CheckCircle size={14} style={{ color: '#059669' }} />
          <span>You have voted. Total votes: {totalVotes.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
