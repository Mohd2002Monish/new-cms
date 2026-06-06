'use client';

import { useState, useEffect } from 'react';
import { publicApi } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export default function CommentsSection({ articleSlug }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const { user, openAuthModal } = useAuth();

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await publicApi.getComments(articleSlug);
        if (res?.success) setComments(res.data);
      } catch (err) {
        console.error('Failed to load comments', err);
      } finally {
        setLoading(false);
      }
    };
    fetchComments();
  }, [articleSlug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !body.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await publicApi.addComment(articleSlug, { 
        authorName: user.name, 
        body 
      });
      if (res?.success) {
        setComments([res.data, ...comments]);
        setBody('');
      } else {
        setError(res?.message || 'Failed to post comment');
      }
    } catch (err) {
      console.error('Error posting comment', err);
      setError('An error occurred while posting your comment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="comments-section" id="comments">
      <h3 className="comments-title">Comments ({comments.length})</h3>

      {!user ? (
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
            onClick={() => openAuthModal()}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: '#C0392B',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="comments-form">
          {error && <div className="comments-error" role="alert">{error}</div>}
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary, #64748b)', marginBottom: '8px' }}>
            Posting as <strong style={{ color: '#C0392B' }}>{user.name}</strong>
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
      )}

      <div className="comments-list">
        {loading ? (
          <p className="comments-loading">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="comments-empty">No comments yet. Be the first to share your thoughts!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className="comment-card">
              <div className="comment-header">
                <div className="comment-avatar" aria-hidden="true">
                  {comment.authorName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="comment-author">{comment.authorName}</h4>
                  <time className="comment-time" dateTime={comment.createdAt}>
                    {timeAgo(comment.createdAt)}
                  </time>
                </div>
              </div>
              <p className="comment-body">{comment.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
