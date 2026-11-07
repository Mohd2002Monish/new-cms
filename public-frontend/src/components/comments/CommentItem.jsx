'use client';

import { timeAgo } from '@/lib/utils';

/**
 * CommentItem — Displays an individual reader comment card
 */
export default function CommentItem({ comment }) {
  return (
    <div className="comment-card">
      <div className="comment-header">
        <div className="comment-avatar" aria-hidden="true">
          {comment.authorName ? comment.authorName.charAt(0).toUpperCase() : 'U'}
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
  );
}

