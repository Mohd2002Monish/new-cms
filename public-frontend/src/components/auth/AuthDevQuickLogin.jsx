'use client';

/**
 * AuthDevQuickLogin — Instant session launcher for local testing (Reader, Editor, Admin)
 */
export default function AuthDevQuickLogin({ onDevLogin, submitting }) {
  return (
    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }} />
          Dev 1-Click Login
        </span>
        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Instant Session</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
        <button
          type="button"
          disabled={submitting}
          onClick={() => onDevLogin('reader')}
          style={{
            padding: '0.5rem',
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.2rem'
          }}
        >
          <span>📖</span>
          <span>Reader</span>
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => onDevLogin('editor')}
          style={{
            padding: '0.5rem',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.2rem'
          }}
        >
          <span>✍️</span>
          <span>Editor</span>
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => onDevLogin('admin')}
          style={{
            padding: '0.5rem',
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.2rem'
          }}
        >
          <span>👑</span>
          <span>Admin</span>
        </button>
      </div>
    </div>
  );
}

