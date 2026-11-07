'use client';

/**
 * FeedSkeletons — Pulsing placeholder cards during infinite news scroll
 */
export default function FeedSkeletons({ count = 3, hasArticles = false }) {
  return (
    <div
      className="rail-card-grid"
      style={{ marginTop: hasArticles ? '1rem' : 0 }}
      aria-live="polite"
      aria-label="Loading more stories"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          style={{
            borderRadius: '12px',
            height: '240px',
            backgroundColor: 'var(--color-bg-alt, #f1f5f9)',
            animation: 'pulse 1.5s infinite',
            border: '1px solid var(--color-border, #e2e8f0)',
          }}
        />
      ))}
    </div>
  );
}

