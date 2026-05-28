'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Link as TiptapLink } from '@tiptap/extension-link';
import { Image as TiptapImage } from '@tiptap/extension-image';

/**
 * TiptapRenderer — renders a Tiptap JSON document in read-only mode.
 * Uses the same extensions as the admin panel editor for 1:1 fidelity.
 *
 * @param {object} content  - The Tiptap JSON document object
 * @param {string} className - Additional CSS class for the wrapper
 */
export default function TiptapRenderer({ content, className = '' }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      TiptapImage.configure({ inline: false }),
    ],
    content: content || null,
    editable: false,
    immediatelyRender: false, // Avoids SSR hydration mismatch
  });

  // Update content if the prop changes (e.g. client-side navigation)
  useEffect(() => {
    if (editor && content && !editor.isDestroyed) {
      editor.commands.setContent(content, false);
    }
  }, [editor, content]);

  if (!content) {
    return (
      <div className={`article-body ${className}`}>
        <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
          No content available.
        </p>
      </div>
    );
  }

  return (
    <div className={`article-body ${className}`}>
      <EditorContent editor={editor} />
    </div>
  );
}
