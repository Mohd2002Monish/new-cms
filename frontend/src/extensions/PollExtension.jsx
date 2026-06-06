import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { useState, useEffect } from 'react';
import api from '../services/api.js';

function PollView(props) {
  const pollId = props.node.attrs.pollId;
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPoll = async () => {
    if (!pollId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/public/polls/${pollId}`);
      if (res.data?.success) {
        setPoll(res.data.data);
      } else {
        setError('Poll not found');
      }
    } catch (err) {
      console.error('Failed to load poll in editor', err);
      setError('Failed to load poll details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPoll();
  }, [pollId]);

  const handleDelete = () => {
    if (window.confirm('Remove this poll from the article?')) {
      props.deleteNode();
    }
  };

  if (!pollId) {
    return (
      <NodeViewWrapper className="tiptap-opinion-poll-node border-2 border-dashed border-slate-300 rounded-xl p-4 my-4 bg-slate-50 text-center text-sm text-slate-500 italic">
        Empty Opinion Poll Node
      </NodeViewWrapper>
    );
  }

  if (loading) {
    return (
      <NodeViewWrapper className="tiptap-opinion-poll-node border border-slate-200 rounded-xl p-4 my-4 bg-slate-50 flex items-center justify-center gap-2 text-sm text-slate-500 select-none">
        <svg className="animate-spin h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>Loading poll preview...</span>
      </NodeViewWrapper>
    );
  }

  if (error || !poll) {
    return (
      <NodeViewWrapper className="tiptap-opinion-poll-node border border-red-200 rounded-xl p-4 my-4 bg-red-50/50 flex justify-between items-center text-sm text-red-800 select-none">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error || 'Error loading poll info'} (ID: {pollId})</span>
        </div>
        <div className="flex gap-2">
          <button onClick={loadPoll} className="px-2.5 py-1 text-xs bg-white border border-red-200 text-red-700 font-bold rounded-lg hover:bg-red-50 transition-colors">
            Retry
          </button>
          <button onClick={handleDelete} className="px-2.5 py-1 text-xs bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">
            Delete
          </button>
        </div>
      </NodeViewWrapper>
    );
  }

  const totalVotes = poll.totalVotes || poll.options.reduce((acc, o) => acc + o.votes, 0);

  return (
    <NodeViewWrapper className="tiptap-opinion-poll-node relative border border-slate-200 rounded-xl p-5 my-6 bg-slate-50/70 shadow-sm max-w-xl mx-auto select-none cursor-default">
      {/* Accent Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#C0392B] rounded-t-xl" />

      {/* Close/Delete Action */}
      <button
        type="button"
        title="Delete poll"
        onClick={handleDelete}
        className="absolute top-4 right-4 text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      {/* Tag */}
      <div className="flex items-center gap-1.5 text-[#C0392B] font-bold text-xs uppercase tracking-wider mb-2">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span>Opinion Poll Preview</span>
      </div>

      {/* Question */}
      <h4 className="text-base font-black text-slate-800 leading-snug mb-4 pr-6">
        {poll.question}
      </h4>

      {/* Options */}
      <div className="space-y-2.5">
        {poll.options.map((option) => {
          const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
          return (
            <div
              key={option._id}
              className="relative flex justify-between items-center px-4 py-2.5 rounded-lg border border-slate-200 bg-white overflow-hidden text-sm"
            >
              {/* Progress Background */}
              <div
                className="absolute top-0 left-0 bottom-0 bg-red-500/5 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />

              <span className="relative z-10 font-semibold text-slate-700">{option.text}</span>
              <div className="relative z-10 flex items-center gap-2">
                <span className="font-bold text-[#C0392B]">{percentage}%</span>
                <span className="text-xs text-slate-400">({option.votes} votes)</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer statistics */}
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
        <span>Total Votes: {totalVotes.toLocaleString()}</span>
        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono text-[10px]">ID: {pollId}</span>
      </div>
    </NodeViewWrapper>
  );
}

export const PollExtension = Node.create({
  name: 'poll',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      pollId: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="poll"]',
        getAttrs: (dom) => ({
          pollId: dom.getAttribute('data-poll-id'),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'poll',
        'data-poll-id': HTMLAttributes.pollId || '',
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PollView);
  },
});
