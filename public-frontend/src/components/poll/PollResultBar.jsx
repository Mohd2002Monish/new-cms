'use client';

/**
 * PollResultBar — Renders a vote result bar with GPU-composited scaleX percentage fill
 */
export default function PollResultBar({ option, percentage }) {
  return (
    <div 
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
      {/* Visual percentage fill background - GPU accelerated compositor animation */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, bottom: 0,
        width: '100%',
        transform: `scaleX(${percentage / 100})`,
        transformOrigin: 'left',
        backgroundColor: 'rgba(220, 38, 38, 0.08)',
        transition: 'transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)',
        zIndex: 1,
        willChange: 'transform'
      }} />

      <span style={{
        position: 'relative',
        zIndex: 2,
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--color-text)',
        minWidth: 0,
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        whiteSpace: 'nowrap'
      }}>
        {option.text}
      </span>

      <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-brand)' }}>{percentage}%</span>
        <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>({option.votes.toLocaleString()})</span>
      </div>
    </div>
  );
}

