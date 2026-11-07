'use client';

/**
 * LiveBlogTimeline — Real-time rolling news updates with timeline track
 */
export default function LiveBlogTimeline({ liveUpdates = [] }) {
  return (
    <div style={{ marginTop: '2.5rem', marginBottom: '2.5rem' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        backgroundColor: 'var(--color-bg-alt)', padding: '12px 18px',
        borderRadius: '8px', border: '1px solid var(--color-border)',
        marginBottom: '20px'
      }}>
        <span style={{
          width: '9px', height: '9px', backgroundColor: 'var(--color-brand)',
          borderRadius: '50%', display: 'inline-block',
          boxShadow: '0 0 0 3px rgba(220, 38, 38, 0.2)',
          animation: 'pulse 1.5s infinite', flexShrink: 0
        }} />
        <span style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', color: 'var(--color-brand)', letterSpacing: '0.04em' }}>
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
  );
}

