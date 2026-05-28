import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { selectUser } from '../features/auth/authSlice.js';
import api from '../services/api.js';
import Select from 'react-select';
import Datepicker from 'react-tailwindcss-datepicker';
import { CommentMark } from '../extensions/CommentMark.js';
import MediaLibrary from '../components/MediaLibrary.jsx';

// ─── Toolbar Button ───────────────────────────────────────────────────────────

function ToolbarBtn({ active, onClick, title, children, disabled }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40
        ${active ? 'bg-theme-purple text-white' : 'text-slate-600 hover:bg-slate-100'}`}
    >
      {children}
    </button>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function EditorToolbar({ editor, onImageUpload }) {
  const fileRef = useRef();
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10">
      {/* Text style */}
      <ToolbarBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
        <strong>B</strong>
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
        <em>I</em>
      </ToolbarBtn>
      <ToolbarBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
        <s>S</s>
      </ToolbarBtn>

      <div className="w-px h-5 bg-slate-200 mx-1" />

      {/* Headings */}
      <ToolbarBtn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">H1</ToolbarBtn>
      <ToolbarBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">H2</ToolbarBtn>
      <ToolbarBtn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">H3</ToolbarBtn>

      <div className="w-px h-5 bg-slate-200 mx-1" />

      {/* Lists */}
      <ToolbarBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">• List</ToolbarBtn>
      <ToolbarBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered list">1. List</ToolbarBtn>
      <ToolbarBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">" Quote</ToolbarBtn>
      <ToolbarBtn active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code block">&lt;/&gt;</ToolbarBtn>

      <div className="w-px h-5 bg-slate-200 mx-1" />

      {/* Image upload button */}
      <button
        type="button"
        title="Insert image"
        onClick={() => {
          // Trigger the modal from the parent
          window.dispatchEvent(new CustomEvent('open-media-library', { detail: 'editor' }));
        }}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Image
      </button>

      <div className="w-px h-5 bg-slate-200 mx-1" />

      {/* Undo / Redo */}
      <ToolbarBtn active={false} onClick={() => editor.chain().focus().undo().run()} title="Undo" disabled={!editor.can().undo()}>↩</ToolbarBtn>
      <ToolbarBtn active={false} onClick={() => editor.chain().focus().redo().run()} title="Redo" disabled={!editor.can().redo()}>↪</ToolbarBtn>

      <div className="w-px h-5 bg-slate-200 mx-1" />
      
      <button
        type="button"
        title="Add Comment"
        onClick={() => {
          if (!editor.state.selection.empty) {
            const newId = crypto.randomUUID();
            editor.commands.setComment({ commentId: newId });
            // Dispatch a custom event to the parent
            window.dispatchEvent(new CustomEvent('add-comment', { detail: newId }));
          }
        }}
        disabled={editor.state.selection.empty}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-40"
      >
        💬 Comment
      </button>
    </div>
  );
}

// ─── Live Preview ─────────────────────────────────────────────────────────────

function LivePreview({ title, html, featuredImageUrl, category, categories, tags }) {
  const catName = categories.find((c) => c._id === category)?.name;
  const isEmpty = !html || html === '<p></p>';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      {/* Preview badge */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50">
        <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Live Preview</span>
      </div>

      <div className="p-6 sm:p-10 max-w-3xl mx-auto">
        {/* Category pill */}
        {catName && (
          <span className="inline-block px-3 py-1 text-xs font-bold bg-theme-mint text-slate-800 rounded-full mb-4">
            {catName}
          </span>
        )}

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight mb-4">
          {title || <span className="text-slate-300">Article title will appear here…</span>}
        </h1>

        {/* Tags */}
        {tags && (
          <div className="flex flex-wrap gap-2 mb-6">
            {tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
              <span key={tag} className="px-2.5 py-0.5 bg-theme-lavender/40 text-slate-700 text-xs font-medium rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Featured image */}
        {featuredImageUrl && (
          <img
            src={featuredImageUrl}
            alt="Featured"
            className="w-full h-56 sm:h-72 object-cover rounded-2xl mb-8 border border-slate-100"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}

        {/* Body */}
        {isEmpty ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-xl">
            <p className="text-slate-400 text-sm">Start writing to see the preview…</p>
          </div>
        ) : (
          <div
            className="prose prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Status badge helper ──────────────────────────────────────────────────────

const STATUS_STYLE = {
  draft:            'bg-slate-100 text-slate-700',
  pending_approval: 'bg-amber-100 text-amber-700',
  live:             'bg-emerald-100 text-emerald-700',
  rejected:         'bg-red-100 text-red-700',
};

// ─── Comment Thread Panel ───────────────────────────────────────────────────────

function CommentThreadPanel({ comments, setComments, postId, user, activeCommentId, editor }) {
  const [replyText, setReplyText] = useState({});
  const [newCommentBody, setNewCommentBody] = useState('');

  const submitNewComment = async (tempId) => {
    if (!newCommentBody.trim()) return;
    try {
      const { data } = await api.post(`/posts/${postId}/comments`, {
        paragraphKey: tempId,
        body: newCommentBody,
      });
      // Replace temp comment
      setComments(prev => prev.map(c => c._id === 'temp_' + tempId ? data.data : c));
      setNewCommentBody('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post comment');
    }
  };

  const cancelNewComment = (tempId) => {
    setComments(prev => prev.filter(c => c._id !== 'temp_' + tempId));
    setNewCommentBody('');
    editor?.commands.unsetComment();
  };

  const submitReply = async (commentId) => {
    if (!replyText[commentId]?.trim()) return;
    try {
      const { data } = await api.post(`/posts/${postId}/comments/${commentId}/reply`, {
        body: replyText[commentId],
      });
      setComments(prev => prev.map(c => c._id === commentId ? data.data : c));
      setReplyText(prev => ({ ...prev, [commentId]: '' }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post reply');
    }
  };

  const toggleResolve = async (comment) => {
    try {
      const { data } = await api.patch(`/posts/${postId}/comments/${comment._id}/resolve`, {
        isResolved: !comment.isResolved,
      });
      setComments(prev => prev.map(c => c._id === comment._id ? data.data : c));
      
      if (editor) {
        // Find mark and update its `isResolved` visually (or let the backend reload handle it next time)
        // For immediate feedback, we can re-apply mark with isResolved true
        // Doing this accurately requires selecting the mark and updating it.
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resolve comment');
    }
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm('Delete this thread entirely?')) return;
    try {
      await api.delete(`/posts/${postId}/comments/${commentId}`);
      setComments(prev => prev.filter(c => c._id !== commentId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete comment');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col gap-4 h-[700px] overflow-y-auto">
      <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-2">Comments</h3>
      {comments.length === 0 && <p className="text-sm text-slate-500 italic">No comments yet.</p>}
      
      {comments.map(c => {
        const isActive = activeCommentId === c.paragraphKey;
        if (c.isTemp) {
          return (
            <div key={c._id} className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50">
              <h4 className="font-bold text-slate-800 text-sm mb-2">New Comment</h4>
              <textarea
                value={newCommentBody}
                onChange={e => setNewCommentBody(e.target.value)}
                placeholder="What needs to be changed?"
                className="w-full p-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 mb-2 resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <button onClick={() => submitNewComment(c.paragraphKey)} className="flex-1 bg-amber-500 text-white font-bold text-xs py-2 rounded hover:bg-amber-600 transition-colors">Submit</button>
                <button onClick={() => cancelNewComment(c.paragraphKey)} className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold text-xs py-2 rounded hover:bg-slate-50 transition-colors">Cancel</button>
              </div>
            </div>
          );
        }

        return (
          <div key={c._id} className={`p-4 rounded-xl border transition-all ${isActive ? 'border-amber-400 shadow-md ring-2 ring-amber-100' : 'border-slate-100'} ${c.isResolved ? 'opacity-60 bg-slate-50' : 'bg-white'}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-800">{c.authorId?.name}</span>
                <span className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => toggleResolve(c)} className="text-xs text-emerald-600 font-semibold hover:underline" title={c.isResolved ? 'Unresolve' : 'Mark as resolved'}>
                  {c.isResolved ? '✓ Resolved' : 'Resolve'}
                </button>
                {(user.role === 'admin' || user._id === c.authorId?._id) && (
                  <button onClick={() => deleteComment(c._id)} className="text-xs text-red-500 font-semibold hover:underline ml-2" title="Delete">🗑</button>
                )}
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-3">{c.body}</p>
            
            {/* Replies */}
            {c.replies?.length > 0 && (
              <div className="space-y-2 mt-3 pl-3 border-l-2 border-slate-100">
                {c.replies.map((r, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-xs text-slate-800">{r.authorId?.name}</span>
                      <span className="text-[10px] text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-slate-600">{r.body}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply Input */}
            {!c.isResolved && (
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={replyText[c._id] || ''}
                  onChange={e => setReplyText(prev => ({ ...prev, [c._id]: e.target.value }))}
                  placeholder="Reply..."
                  className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-amber-400"
                  onKeyDown={e => e.key === 'Enter' && submitReply(c._id)}
                />
                <button onClick={() => submitReply(c._id)} className="text-xs font-bold text-white bg-slate-800 px-3 rounded-lg hover:bg-slate-700">Reply</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Editor Page ─────────────────────────────────────────────────────────

export default function PostEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const isNew = !id || id === 'new';

  const [post, setPost] = useState(null);
  const [categories, setCategories] = useState([]);
  const [availableEditors, setAvailableEditors] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [error, setError] = useState(null);

  // Revisions
  const [showHistory, setShowHistory] = useState(false);
  const [revisions, setRevisions] = useState([]);
  const [viewingRevision, setViewingRevision] = useState(null);
  const [restoring, setRestoring] = useState(false);

  // Write | Preview tab
  const [activeTab, setActiveTab] = useState('write');
  const [rightPanel, setRightPanel] = useState('meta');

  // Comments
  const [comments, setComments] = useState([]);
  const [activeCommentId, setActiveCommentId] = useState(null);

  // Media Modal
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaTarget, setMediaTarget] = useState(null);

  // Drag-over state for the editor drop zone
  const [isDragOver, setIsDragOver] = useState(false);

  // Live preview HTML (updated on every editor change)
  const [previewHtml, setPreviewHtml] = useState('');

  const [meta, setMeta] = useState({
    title: '',
    excerpt: '',
    category: '',
    tags: '',
    coAuthors: [],
    featuredImageUrl: '',
    seo: {
      metaTitle: '',
      metaDescription: '',
      ogTitle: '',
      ogDescription: '',
      ogImage: '',
      canonicalUrl: '',
      noIndex: false,
      focusKeyword: '',
    },
    isBreaking: false,
    isSlider: false,
    priority: 'normal',
    breakingExpiresAt: '',
    breakingExpiresTime: '00:00',
  });

  // ─── Tiptap editor ──────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing your article here… You can also drag & drop images.' }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false }),
      CommentMark,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setPreviewHtml(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      let foundCommentId = null;
      editor.state.doc.nodesBetween(from, to, (node) => {
        const mark = node.marks.find((m) => m.type.name === 'comment');
        if (mark) foundCommentId = mark.attrs.commentId;
      });
      setActiveCommentId(foundCommentId);
    }
  });

  // ─── Load post + categories + editors ───────────────────────────────────────
  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data.data || [])).catch(() => {});
    
    if (user?.role !== 'editor') {
      api.get('/users?role=editor').then(({ data }) => setAvailableEditors(data.data || [])).catch(() => {});
    }

    if (!isNew) {
      api.get(`/posts/${id}`)
        .then(({ data }) => {
          const p = data.data;
          setPost(p);
          setMeta({
            title: p.title || '',
            excerpt: p.excerpt || '',
            category: p.category?._id || '',
            tags: (p.tags || []).join(', '),
            coAuthors: (p.coAuthors || []).map(c => c._id || c),
            featuredImageUrl: p.featuredImage?.url || '',
            seo: {
              metaTitle: p.seo?.metaTitle || '',
              metaDescription: p.seo?.metaDescription || '',
              ogTitle: p.seo?.ogTitle || '',
              ogDescription: p.seo?.ogDescription || '',
              ogImage: p.seo?.ogImage || '',
              canonicalUrl: p.seo?.canonicalUrl || '',
              noIndex: p.seo?.noIndex || false,
              focusKeyword: p.seo?.focusKeyword || '',
            },
            isBreaking: p.isBreaking || false,
            isSlider: p.isSlider || false,
            priority: p.priority || 'normal',
            breakingExpiresAt: p.breakingExpiresAt ? new Date(p.breakingExpiresAt).toISOString().slice(0, 10) : '',
            breakingExpiresTime: p.breakingExpiresAt ? new Date(p.breakingExpiresAt).toISOString().slice(11, 16) : '00:00',
          });
          fetchRevisions();
          fetchComments();
        })
        .catch(() => setError('Post not found or access denied'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const fetchComments = async () => {
    try {
      const { data } = await api.get(`/posts/${id}/comments`);
      setComments(data.data);
    } catch (err) {
      console.error('Failed to fetch comments', err);
    }
  };

  const fetchRevisions = async () => {
    try {
      const { data } = await api.get(`/posts/${id}/revisions`);
      setRevisions(data.data);
    } catch (err) {
      console.error('Failed to fetch revisions', err);
    }
  };

  const loadRevisionPreview = (rev) => {
    setViewingRevision(rev);
    setMeta({
      title: rev.title || '',
      excerpt: rev.excerpt || '',
      category: rev.category || '',
      tags: (rev.tags || []).join(', '),
      coAuthors: (rev.coAuthors || []).map(c => c._id || c),
      featuredImageUrl: rev.featuredImage?.url || '',
      seo: {
        metaTitle: rev.seo?.metaTitle || '',
        metaDescription: rev.seo?.metaDescription || '',
        ogTitle: rev.seo?.ogTitle || '',
        ogDescription: rev.seo?.ogDescription || '',
        ogImage: rev.seo?.ogImage || '',
        canonicalUrl: rev.seo?.canonicalUrl || '',
        noIndex: rev.seo?.noIndex || false,
        focusKeyword: rev.seo?.focusKeyword || '',
      },
      isBreaking: rev.isBreaking || false,
      isSlider: rev.isSlider || false,
      priority: rev.priority || 'normal',
      breakingExpiresAt: rev.breakingExpiresAt ? new Date(rev.breakingExpiresAt).toISOString().slice(0, 10) : '',
      breakingExpiresTime: rev.breakingExpiresAt ? new Date(rev.breakingExpiresAt).toISOString().slice(11, 16) : '00:00',
    });
    if (editor) {
      editor.commands.setContent(rev.content);
      setPreviewHtml(editor.getHTML());
    }
  };

  const cancelRevisionPreview = () => {
    setViewingRevision(null);
    // Restore current post state
    setMeta({
      title: post.title || '',
      excerpt: post.excerpt || '',
      category: post.category?._id || '',
      tags: (post.tags || []).join(', '),
      coAuthors: (post.coAuthors || []).map(c => c._id || c),
      featuredImageUrl: post.featuredImage?.url || '',
      seo: {
        metaTitle: post.seo?.metaTitle || '',
        metaDescription: post.seo?.metaDescription || '',
        ogTitle: post.seo?.ogTitle || '',
        ogDescription: post.seo?.ogDescription || '',
        ogImage: post.seo?.ogImage || '',
        canonicalUrl: post.seo?.canonicalUrl || '',
        noIndex: post.seo?.noIndex || false,
        focusKeyword: post.seo?.focusKeyword || '',
      },
      isBreaking: post.isBreaking || false,
      isSlider: post.isSlider || false,
      priority: post.priority || 'normal',
      breakingExpiresAt: post.breakingExpiresAt ? new Date(post.breakingExpiresAt).toISOString().slice(0, 10) : '',
      breakingExpiresTime: post.breakingExpiresAt ? new Date(post.breakingExpiresAt).toISOString().slice(11, 16) : '00:00',
    });
    if (editor) {
      editor.commands.setContent(post.content);
      setPreviewHtml(editor.getHTML());
    }
  };

  const handleRestoreRevision = async () => {
    if (!viewingRevision) return;
    if (!window.confirm('Are you sure you want to restore this version? This will overwrite the current draft.')) return;
    
    setRestoring(true);
    try {
      const { data } = await api.post(`/posts/${id}/revisions/${viewingRevision.version}/restore`);
      setPost(data.data);
      setViewingRevision(null);
      setSaveMsg(`Restored Version ${viewingRevision.version}`);
      setTimeout(() => setSaveMsg(''), 3000);
      fetchRevisions();
    } catch (err) {
      alert(err.response?.data?.message || 'Restore failed');
    } finally {
      setRestoring(false);
    }
  };

  // Set editor content once both post and editor are ready
  useEffect(() => {
    if (editor && post?.content && !viewingRevision) {
      editor.commands.setContent(post.content);
      setPreviewHtml(editor.getHTML());
    }
  }, [editor, post, viewingRevision]);

  // Listen for 'add-comment' event from EditorToolbar
  useEffect(() => {
    const handleAddComment = (e) => {
      const newId = e.detail;
      const tempComment = {
        _id: 'temp_' + newId,
        paragraphKey: newId,
        isTemp: true,
        body: '',
        replies: []
      };
      setComments(prev => [...prev, tempComment]);
      setActiveCommentId(newId);
      setRightPanel('comments');
    };
    window.addEventListener('add-comment', handleAddComment);
    return () => window.removeEventListener('add-comment', handleAddComment);
  }, []);

  // Listen for 'open-media-library'
  useEffect(() => {
    const handleOpenMedia = (e) => {
      setMediaTarget(e.detail);
      setShowMediaModal(true);
    };
    window.addEventListener('open-media-library', handleOpenMedia);
    return () => window.removeEventListener('open-media-library', handleOpenMedia);
  }, []);

  const handleMediaSelect = (asset) => {
    if (mediaTarget === 'editor' && editor) {
      editor.chain().focus().setImage({ src: asset.url, alt: asset.altText || asset.fileName }).run();
    } else if (mediaTarget === 'featured') {
      setMeta((m) => ({ ...m, featuredImageUrl: asset.url }));
    }
    setShowMediaModal(false);
  };

  // ─── Image insertion helper (used by drag/drop) ──────────────────
  const insertImageFile = useCallback((file) => {
    if (!editor) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target.result; // base64 data URL
      editor.chain().focus().setImage({ src, alt: file.name }).run();
    };
    reader.readAsDataURL(file);
  }, [editor]);

  // ─── Drag & Drop handlers ───────────────────────────────────────────────────
  const handleDragOver = (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    files.forEach((file) => insertImageFile(file));
  };

  // ─── Save / Submit ──────────────────────────────────────────────────────────
  const buildPayload = () => {
    const payload = {
      title: meta.title,
      excerpt: meta.excerpt,
      category: meta.category || null,
      tags: meta.tags.split(',').map((t) => t.trim()).filter(Boolean),
      coAuthors: meta.coAuthors,
      content: editor?.getJSON(),
      contentHtml: editor?.getHTML(),
      seo: meta.seo,
      featuredImage: meta.featuredImageUrl
        ? { url: meta.featuredImageUrl, alt: meta.title }
        : undefined,
    };

    if (user?.role !== 'editor') {
      payload.isBreaking = meta.isBreaking;
      payload.isSlider = meta.isSlider;
      payload.priority = meta.priority;
      payload.breakingExpiresAt = meta.breakingExpiresAt ? new Date(`${meta.breakingExpiresAt}T${meta.breakingExpiresTime}:00`).toISOString() : null;
    }

    return payload;
  };

  const handleSave = async () => {
    if (!meta.title.trim()) { setError('Title is required'); return; }
    setSaving(true); setError(null);
    try {
      const payload = buildPayload();
      if (isNew) {
        const { data } = await api.post('/posts', payload);
        navigate(`/posts/${data.data._id}`, { replace: true });
      }
      else {
        await api.patch(`/posts/${id}`, payload);
        fetchRevisions(); // refresh history after save
      }
      setSaveMsg('Saved!');
      setTimeout(() => setSaveMsg(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (isNew) { setError('Save the draft first'); return; }
    setSubmitting(true); setError(null);
    try {
      await api.patch(`/posts/${id}/submit`);
      navigate('/posts');
    } catch (err) {
      setError(err.response?.data?.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-theme-purple border-t-transparent rounded-full" />
      </div>
    );
  }

  const isEditable = isNew || !post || ['draft', 'rejected'].includes(post.status);
  const isAdmin = user?.role === 'admin';
  const canEdit = isEditable || isAdmin;

  return (
    <div className="space-y-4">

      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-slate-900">
            {isNew ? 'New Post' : 'Edit Post'}
          </h1>
          {post && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLE[post.status] ?? ''}`}>
              {post.status?.replace('_', ' ').toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {saveMsg && <span className="text-sm text-emerald-600 font-semibold animate-fade-in">{saveMsg}</span>}
          {error   && <span className="text-sm text-red-500">{error}</span>}

          {!isNew && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${showHistory ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              History
            </button>
          )}

          {canEdit && !viewingRevision && (
            <button
              onClick={handleSave}
              disabled={saving}
              id="save-post-btn"
              className="px-5 py-2.5 border-2 border-theme-purple text-theme-purple font-bold rounded-xl
                hover:bg-theme-purple hover:text-white transition-all disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
          )}

          {canEdit && !isNew && !viewingRevision && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              id="submit-post-btn"
              className="px-5 py-2.5 bg-theme-purple text-white font-bold rounded-xl
                hover:bg-purple-600 transition-all hover:shadow-lg hover:shadow-theme-purple/30 disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : 'Submit for Review'}
            </button>
          )}
        </div>
      </div>

      {/* Rejection banner */}
      {post?.status === 'rejected' && post.rejectionReason && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex gap-2">
          <span className="text-red-400 mt-0.5">⚠</span>
          <div><strong>Rejected:</strong> {post.rejectionReason}</div>
        </div>
      )}

      {/* ── Write / Preview tabs ── */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {['write', 'preview'].map((tab) => (
          <button
            key={tab}
            id={`tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-bold capitalize transition-all
              ${activeTab === tab
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab === 'write' ? '✏️ Write' : '👁 Preview'}
          </button>
        ))}
      </div>

      {viewingRevision && (
        <div className="bg-amber-100 border border-amber-300 text-amber-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="font-bold">Viewing Version {viewingRevision.version}</span> (Saved {new Date(viewingRevision.createdAt).toLocaleString()})
          </div>
          <div className="flex gap-3">
            <button onClick={cancelRevisionPreview} className="px-4 py-2 text-sm font-bold text-amber-800 hover:bg-amber-200 rounded-lg transition-colors">
              Cancel Preview
            </button>
            {canEdit && (
              <button onClick={handleRestoreRevision} disabled={restoring} className="px-4 py-2 text-sm font-bold bg-amber-600 text-white hover:bg-amber-700 rounded-lg transition-colors">
                {restoring ? 'Restoring...' : 'Restore This Version'}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-6 items-start relative">
        <div className={`flex-1 transition-all ${showHistory ? 'mr-80' : ''}`}>
          {/* ── WRITE TAB ── */}
          {activeTab === 'write' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Left: Title + Editor */}
          <div className="xl:col-span-2 space-y-4">

            {/* Title */}
            <div className="bg-white rounded-2xl border border-slate-100 px-5 py-4">
              <input
                id="post-title"
                type="text"
                placeholder="Article title…"
                value={meta.title}
                onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
                disabled={!canEdit}
                className="w-full text-2xl font-black text-slate-900 border-none outline-none placeholder-slate-300 bg-transparent"
              />
            </div>

            {/* Editor with drag-and-drop zone */}
            <div
              className={`bg-white rounded-2xl border-2 overflow-hidden transition-colors duration-150 relative
                ${isDragOver ? 'border-theme-purple border-dashed bg-theme-purple/5' : 'border-slate-100'}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDropCapture={handleDrop}
            >
              {canEdit && <EditorToolbar editor={editor} onImageUpload={insertImageFile} />}

              {/* Drag overlay hint */}
              {isDragOver && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <div className="bg-theme-purple text-white px-6 py-3 rounded-2xl font-bold shadow-xl text-sm">
                    📸 Drop image to insert
                  </div>
                </div>
              )}

              <EditorContent
                editor={editor}
                className="prose prose-slate max-w-none px-6 py-5 min-h-[420px] focus:outline-none"
              />

              {/* Drop hint footer */}
              {canEdit && (
                <div className="flex items-center justify-center gap-2 py-3 border-t border-slate-50 text-xs text-slate-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Drag & drop images directly into the editor, or use the Image button in the toolbar
                </div>
              )}
            </div>
            
            {/* SEO Panel (Collapsible) */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mt-6">
              <details className="group">
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔍</span>
                    <h3 className="font-bold text-slate-800">SEO & Social Meta</h3>
                  </div>
                  <svg className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                
                <div className="p-6 space-y-6">
                  {/* Google Snippet Preview */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl max-w-2xl">
                    <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">Google Snippet Preview</p>
                    <div className="text-[14px] text-[#202124] mb-1 font-medium">{meta.seo.canonicalUrl || 'https://yoursite.com/news/article'}</div>
                    <div className="text-xl text-[#1a0dab] cursor-pointer hover:underline mb-1 line-clamp-1">{meta.seo.metaTitle || meta.title || 'Your Meta Title Here'}</div>
                    <div className="text-sm text-[#4d5156] line-clamp-2">{meta.seo.metaDescription || meta.excerpt || 'Write a compelling meta description to encourage users to click on your search result. It should be descriptive and actionable.'}</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="flex justify-between text-sm font-bold text-slate-700 mb-1.5">
                          Meta Title
                          <span className={`text-xs ${meta.seo.metaTitle.length > 60 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                            {meta.seo.metaTitle.length} / 60
                          </span>
                        </label>
                        <input
                          type="text"
                          value={meta.seo.metaTitle}
                          onChange={(e) => setMeta(m => ({ ...m, seo: { ...m.seo, metaTitle: e.target.value } }))}
                          disabled={!canEdit}
                          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-theme-purple/30 focus:border-theme-purple"
                        />
                      </div>
                      
                      <div>
                        <label className="flex justify-between text-sm font-bold text-slate-700 mb-1.5">
                          Meta Description
                          <span className={`text-xs ${meta.seo.metaDescription.length > 160 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                            {meta.seo.metaDescription.length} / 160
                          </span>
                        </label>
                        <textarea
                          rows={3}
                          value={meta.seo.metaDescription}
                          onChange={(e) => setMeta(m => ({ ...m, seo: { ...m.seo, metaDescription: e.target.value } }))}
                          disabled={!canEdit}
                          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-theme-purple/30 focus:border-theme-purple"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Focus Keyword</label>
                        <input
                          type="text"
                          value={meta.seo.focusKeyword}
                          onChange={(e) => setMeta(m => ({ ...m, seo: { ...m.seo, focusKeyword: e.target.value } }))}
                          disabled={!canEdit}
                          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-theme-purple/30 focus:border-theme-purple"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Canonical URL</label>
                        <input
                          type="text"
                          value={meta.seo.canonicalUrl}
                          onChange={(e) => setMeta(m => ({ ...m, seo: { ...m.seo, canonicalUrl: e.target.value } }))}
                          disabled={!canEdit}
                          placeholder="Leave blank to use default URL"
                          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-theme-purple/30 focus:border-theme-purple"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Social Title (OG Title)</label>
                        <input
                          type="text"
                          value={meta.seo.ogTitle}
                          onChange={(e) => setMeta(m => ({ ...m, seo: { ...m.seo, ogTitle: e.target.value } }))}
                          disabled={!canEdit}
                          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-theme-purple/30 focus:border-theme-purple"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Social Image (OG Image)</label>
                        <FeaturedImagePicker
                          value={meta.seo.ogImage}
                          onChange={(url) => setMeta(m => ({ ...m, seo: { ...m.seo, ogImage: url } }))}
                          disabled={!canEdit}
                        />
                      </div>
                      
                      <div className="pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={meta.seo.noIndex}
                            onChange={(e) => setMeta(m => ({ ...m, seo: { ...m.seo, noIndex: e.target.checked } }))}
                            disabled={!canEdit}
                            className="w-4 h-4 text-theme-purple border-slate-300 rounded focus:ring-theme-purple"
                          />
                          <span className="text-sm font-bold text-slate-700">noIndex (Hide from Search Engines)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </div>

          {/* Right: Meta sidebar or Comments */}
          <div className="space-y-4">
            
            {/* Panel Toggle */}
            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
              <button 
                onClick={() => setRightPanel('meta')} 
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${rightPanel === 'meta' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Settings
              </button>
              {!isNew && (
                <button 
                  onClick={() => setRightPanel('comments')} 
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${rightPanel === 'comments' ? 'bg-white shadow text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Comments
                  {comments.length > 0 && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-xs">{comments.length}</span>}
                </button>
              )}
            </div>

            {rightPanel === 'meta' ? (
              <>
                {/* Excerpt */}
                <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Excerpt</label>
              <textarea
                value={meta.excerpt}
                onChange={(e) => setMeta((m) => ({ ...m, excerpt: e.target.value }))}
                disabled={!canEdit}
                rows={3}
                placeholder="Short summary shown in article lists…"
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 resize-none
                  focus:outline-none focus:ring-2 focus:ring-theme-purple/30 focus:border-theme-purple"
              />
            </div>

            {/* Post Settings (Category/Tags/Featured Image) */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm mb-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="text-theme-purple">⚙️</span> Post Settings
                </h3>

                <div className="space-y-4">
                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                    <Select
                      options={categories.map((c) => ({ value: c._id, label: c.name }))}
                      value={meta.category ? { value: meta.category, label: categories.find(c => c._id === meta.category)?.name || '' } : null}
                      onChange={(selected) => setMeta((m) => ({ ...m, category: selected ? selected.value : '' }))}
                      isDisabled={!canEdit}
                      placeholder="— Select category —"
                      className="text-sm"
                      isClearable
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderRadius: '0.75rem',
                          borderColor: '#e2e8f0',
                          padding: '2px',
                          boxShadow: 'none',
                          '&:hover': { borderColor: '#cbd5e1' }
                        })
                      }}
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tags</label>
                    <input
                      type="text"
                      value={meta.tags}
                      onChange={(e) => setMeta((m) => ({ ...m, tags: e.target.value }))}
                      disabled={!canEdit}
                      placeholder="news, politics, economy…"
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2
                        focus:outline-none focus:ring-2 focus:ring-theme-purple/30 focus:border-theme-purple"
                    />
                    <p className="text-xs text-slate-400 mt-1.5">Separate tags with commas</p>
                  </div>

                  {/* Co-Authors (Managers/Admins only) */}
                  {user?.role !== 'editor' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Co-Authors</label>
                      <Select
                        isMulti
                        isDisabled={!canEdit}
                        options={availableEditors.map(ed => ({ value: ed._id, label: ed.name }))}
                        value={availableEditors
                          .filter(ed => meta.coAuthors.includes(ed._id))
                          .map(ed => ({ value: ed._id, label: ed.name }))}
                        onChange={(selected) => {
                          setMeta(m => ({ ...m, coAuthors: selected.map(s => s.value) }));
                        }}
                        placeholder="Select co-authors..."
                        className="text-sm"
                        styles={{
                          control: (base) => ({
                            ...base,
                            borderRadius: '0.75rem',
                            borderColor: '#e2e8f0',
                            padding: '1px',
                            boxShadow: 'none',
                            '&:hover': { borderColor: '#cbd5e1' }
                          })
                        }}
                      />
                    </div>
                  )}

                  {/* Featured image */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Featured Image
                    </label>
                    <FeaturedImagePicker
                      value={meta.featuredImageUrl}
                      onChange={(url) => setMeta((m) => ({ ...m, featuredImageUrl: url }))}
                      disabled={!canEdit}
                    />
                  </div>
                </div>
            </div>

            {/* Priority & Alerts (Managers/Admins only) */}
            {user?.role !== 'editor' && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm mb-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="text-red-500">🚨</span> Priority & Alerts
                </h3>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Editorial Priority</label>
                    <Select
                      options={[
                        { value: 'normal', label: '⚪️ Normal' },
                        { value: 'high', label: '🟡 High' },
                        { value: 'urgent', label: '🔴 Urgent' }
                      ]}
                      value={{
                        value: meta.priority,
                        label: meta.priority === 'normal' ? '⚪️ Normal' : meta.priority === 'high' ? '🟡 High' : '🔴 Urgent'
                      }}
                      onChange={(selected) => setMeta(m => ({ ...m, priority: selected.value }))}
                      isDisabled={!canEdit}
                      className="text-sm"
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderRadius: '0.75rem',
                          borderColor: '#e2e8f0',
                          padding: '2px',
                          boxShadow: 'none',
                          backgroundColor: '#f8fafc',
                          '&:hover': { borderColor: '#cbd5e1' }
                        })
                      }}
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <label className="flex items-center justify-between cursor-pointer mb-3">
                      <span className="text-sm font-bold text-slate-700">Breaking News</span>
                      <div className="relative inline-flex items-center">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={meta.isBreaking}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setMeta(m => ({ 
                              ...m, 
                              isBreaking: checked,
                              // auto-set 2 hrs expiry if enabled
                              breakingExpiresAt: checked && !m.breakingExpiresAt 
                                ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10) 
                                : m.breakingExpiresAt,
                              breakingExpiresTime: checked && !m.breakingExpiresAt 
                                ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(11, 16) 
                                : m.breakingExpiresTime
                            }));
                          }}
                          disabled={!canEdit}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                      </div>
                    </label>
                    
                    {meta.isBreaking && (
                      <div className="animate-fade-in bg-red-50 text-red-900 p-3 rounded-xl border border-red-100">
                        <label className="block text-xs font-bold mb-1">Remove Breaking Badge At:</label>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1">
                            <Datepicker
                              useRange={false}
                              asSingle={true}
                              value={{ startDate: meta.breakingExpiresAt, endDate: meta.breakingExpiresAt }}
                              onChange={(newValue) => setMeta(m => ({ ...m, breakingExpiresAt: newValue?.startDate || '' }))}
                              disabled={!canEdit}
                              displayFormat="YYYY-MM-DD"
                              inputClassName="w-full text-sm border border-red-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400/50 bg-white disabled:bg-slate-50 disabled:text-slate-500"
                            />
                          </div>
                          <input
                            type="time"
                            value={meta.breakingExpiresTime}
                            onChange={(e) => setMeta(m => ({ ...m, breakingExpiresTime: e.target.value }))}
                            disabled={!canEdit}
                            className="text-sm border border-red-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400/50 bg-white disabled:bg-slate-50 disabled:text-slate-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm font-bold text-slate-700">Show in Main Slider</span>
                      <div className="relative inline-flex items-center">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={meta.isSlider}
                          onChange={(e) => {
                            setMeta(m => ({ 
                              ...m, 
                              isSlider: e.target.checked
                            }));
                          }}
                          disabled={!canEdit}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-purple"></div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}
            </>
          ) : (
            <CommentThreadPanel 
              comments={comments} 
              setComments={setComments} 
              postId={id} 
              user={user} 
              activeCommentId={activeCommentId} 
              editor={editor}
            />
          )}
          </div>
        </div>
      )}

          {/* ── PREVIEW TAB ── */}
          {activeTab === 'preview' && (
            <LivePreview
              title={meta.title}
              html={previewHtml}
              featuredImageUrl={meta.featuredImageUrl}
              category={meta.category}
              categories={categories}
              tags={meta.tags}
            />
          )}
        </div>

        {/* ── Revision History Sidebar ── */}
        {showHistory && (
          <div className="w-80 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg absolute right-0 top-0">
            <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Revision History</h3>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {revisions.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">No revisions found.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {revisions.map(rev => (
                    <li 
                      key={rev._id} 
                      className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${viewingRevision?._id === rev._id ? 'bg-theme-purple/5 border-l-4 border-theme-purple' : ''}`}
                      onClick={() => loadRevisionPreview(rev)}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-800 text-sm">Version {rev.version}</span>
                        <span className="text-xs text-slate-400">{new Date(rev.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="text-xs text-slate-500 mb-1">
                        {new Date(rev.createdAt).toLocaleTimeString()}
                      </div>
                      <div className="text-xs font-medium text-slate-600">
                        Saved by {rev.savedBy?.name || 'Unknown'}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Media Library Modal */}
      {showMediaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-8">
          <div className="bg-white rounded-3xl w-full max-w-6xl h-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in relative">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-slate-800">Select Media</h2>
              <button onClick={() => setShowMediaModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-slate-500 hover:bg-slate-200 transition-colors shadow-sm">
                ×
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <MediaLibrary onSelect={handleMediaSelect} pickerMode={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Featured Image Picker (drag-drop + URL paste) ────────────────────────────

function FeaturedImagePicker({ value, onChange, disabled }) {
  if (disabled && !value) return <p className="text-sm text-slate-400">No featured image</p>;

  return (
    <div className="space-y-3">
      {!disabled && (
        <div
          className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors border-slate-200 hover:border-theme-lavender"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('open-media-library', { detail: 'featured' }));
          }}
        >
          <svg className="w-6 h-6 text-slate-400 mx-auto mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-xs text-slate-500 font-medium">
            Click to select from Media Library
          </p>
        </div>
      )}

      {/* Preview */}
      {value && (
        <div className="relative group">
          <img
            src={value}
            alt="Featured"
            className="w-full h-36 object-cover rounded-xl border border-slate-100"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full
                flex items-center justify-center text-sm shadow opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove featured image"
            >
              ×
            </button>
          )}
        </div>
      )}
    </div>
  );
}
