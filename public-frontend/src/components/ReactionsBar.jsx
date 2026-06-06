'use client';

import { useState, useEffect } from 'react';
import { publicApi } from '@/lib/api';
import { ThumbsUp, Heart, Zap, Angry, Frown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const EMOJIS = {
  like: <ThumbsUp size={16} />,
  love: <Heart size={16} />,
  wow: <Zap size={16} />,
  angry: <Angry size={16} />,
  sad: <Frown size={16} />,
};

export default function ReactionsBar({ articleSlug }) {
  const [counts, setCounts] = useState({ like: 0, love: 0, wow: 0, angry: 0, sad: 0 });
  const [userReaction, setUserReaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, openAuthModal } = useAuth();

  useEffect(() => {
    const fetchReactions = async () => {
      try {
        const res = await publicApi.getReactions(articleSlug);
        if (res?.success) setCounts(res.data);
        
        // Load optimistic local state from localStorage so the user sees their previous selection
        const local = localStorage.getItem(`reaction_${articleSlug}`);
        if (local) setUserReaction(local);
      } catch (err) {
        console.error('Failed to load reactions', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReactions();
  }, [articleSlug]);

  const handleReact = async (reactionType) => {
    if (!user) {
      openAuthModal();
      return;
    }
    // Optimistic UI update
    const previousReaction = userReaction;
    setUserReaction(reactionType);
    
    setCounts(prev => {
      const newCounts = { ...prev };
      if (previousReaction) newCounts[previousReaction] = Math.max(0, newCounts[previousReaction] - 1);
      newCounts[reactionType] = (newCounts[reactionType] || 0) + 1;
      return newCounts;
    });

    localStorage.setItem(`reaction_${articleSlug}`, reactionType);

    try {
      await publicApi.reactToArticle(articleSlug, reactionType);
    } catch (err) {
      console.error('Failed to save reaction', err);
      // Revert on failure
      setUserReaction(previousReaction);
      localStorage.setItem(`reaction_${articleSlug}`, previousReaction || '');
    }
  };

  if (loading) return <div className="reactions-skeleton">Loading reactions...</div>;

  return (
    <div className="reactions-bar">
      <h3 className="reactions-title">What do you think?</h3>
      <div className="reactions-list">
        {Object.entries(EMOJIS).map(([type, emoji]) => (
          <button
            key={type}
            onClick={() => handleReact(type)}
            className={`reaction-btn ${userReaction === type ? 'active' : ''}`}
            aria-label={`React with ${type}`}
          >
            <span className="reaction-emoji">{emoji}</span>
            <span className="reaction-count">{counts[type] || 0}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
