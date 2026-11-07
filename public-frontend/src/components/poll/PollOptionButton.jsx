'use client';

import { Vote } from 'lucide-react';

/**
 * PollOptionButton — Interactive vote button for unvoted polls
 */
export default function PollOptionButton({ option, onVote, disabled }) {
  return (
    <button
      onClick={() => onVote(option._id)}
      disabled={disabled}
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
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        opacity: disabled ? 0.7 : 1
      }}
      onMouseOver={(e) => {
        if (!disabled) {
          e.currentTarget.style.borderColor = 'var(--color-brand)';
          e.currentTarget.style.backgroundColor = 'var(--color-bg-alt)';
        }
      }}
      onMouseOut={(e) => {
        if (!disabled) {
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.backgroundColor = 'var(--color-surface)';
        }
      }}
    >
      <span>{option.text}</span>
      <Vote size={16} style={{ color: 'var(--color-text-light)' }} />
    </button>
  );
}

