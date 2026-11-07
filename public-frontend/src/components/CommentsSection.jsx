'use client';

import { useState, useEffect } from 'react';
import { publicApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import CommentForm from './comments/CommentForm';
import CommentItem from './comments/CommentItem';

/**
 * CommentsSection — Manages comment fetching, submission, and list view
 */
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

      <CommentForm
        user={user}
        body={body}
        setBody={setBody}
        onSubmit={handleSubmit}
        onOpenAuth={openAuthModal}
        submitting={submitting}
        error={error}
      />

      <div className="comments-list">
        {loading ? (
          <p className="comments-loading">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="comments-empty">No comments yet. Be the first to share your thoughts!</p>
        ) : (
          comments.map((comment) => (
            <CommentItem key={comment._id} comment={comment} />
          ))
        )}
      </div>
    </div>
  );
}
