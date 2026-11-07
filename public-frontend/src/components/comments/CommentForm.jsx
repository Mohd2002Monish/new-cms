'use client';

/**
 * CommentForm — Interactive text form or sign-in CTA for posting reader comments
 */
export default function CommentForm({
  user,
  body,
  setBody,
  onSubmit,
  onOpenAuth,
  submitting,
  error,
}) {
  if (!user) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        backgroundColor: 'var(--color-bg-alt, #f8fafc)',
        borderRadius: '12px',
        border: '1px solid var(--color-border, #e2e8f0)',
        marginBottom: '24px'
      }}>
        <p style={{ color: 'var(--color-text-secondary, #64748b)', fontSize: '14px', marginBottom: '12px' }}>
          Please sign in to join the conversation.
        </p>
        <button 
          type="button" 
          onClick={onOpenAuth}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            backgroundColor: 'var(--color-brand, #c02626)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="comments-form">
      {error && <div className="comments-error" role="alert">{error}</div>}
      <div style={{ fontSize: '13px', color: 'var(--color-text-secondary, #64748b)', marginBottom: '8px' }}>
        Posting as <strong style={{ color: 'var(--color-brand, #c02626)' }}>{user.name}</strong>
      </div>
      <div className="form-group">
        <label htmlFor="body" className="sr-only">Comment</label>
        <textarea
          id="body"
          placeholder="Share your thoughts..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows="3"
          className="comment-textarea"
          disabled={submitting}
        />
      </div>
      <button type="submit" disabled={submitting} className="btn btn-primary comment-submit">
        {submitting ? 'Posting...' : 'Post Comment'}
      </button>
    </form>
  );
}

