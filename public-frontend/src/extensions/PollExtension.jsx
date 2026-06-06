import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import OpinionPoll from '../components/OpinionPoll';

function PollView(props) {
  const pollId = props.node.attrs.pollId;
  return (
    <NodeViewWrapper className="tiptap-opinion-poll-node">
      {pollId ? (
        <OpinionPoll pollId={pollId} />
      ) : (
        <div style={{
          padding: '16px', border: '1.5px dashed var(--color-border)',
          borderRadius: '8px', textAlign: 'center', fontSize: '13px',
          color: 'var(--color-text-secondary)', fontStyle: 'italic'
        }}>
          Empty opinion poll placeholder
        </div>
      )}
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
        getAttrs: dom => ({
          pollId: dom.getAttribute('data-poll-id'),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'poll', 'data-poll-id': HTMLAttributes.pollId || '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PollView);
  },
});
