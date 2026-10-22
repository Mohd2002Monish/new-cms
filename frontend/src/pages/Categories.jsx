import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../features/auth/authSlice.js';
import api from '../services/api.js';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function Categories() {
  const user = useSelector(selectUser);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    description: '',
    parentCategory: '',
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const isAdmin = user?.role === 'admin';

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/categories?all=true${showDeleted ? '&showDeleted=true' : ''}`);
      setCategories(data.data || []);
    } catch (err) {
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [showDeleted]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !form.tags.includes(trimmed)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, trimmed] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  };

  const handleKeyDownTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        parentCategory: form.parentCategory || null,
        tags: form.tags,
      };

      if (editId) {
        await api.patch(`/categories/${editId}`, payload);
      } else {
        await api.post('/categories', payload);
      }
      setForm({ name: '', description: '', parentCategory: '', tags: [] });
      setTagInput('');
      setEditId(null);
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (cat) => {
    try {
      await api.patch(`/categories/${cat._id}`, { isActive: !cat.isActive });
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.message || 'Toggle failed');
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.delete(`/categories/${cat._id}`);
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleRestore = async (cat) => {
    try {
      await api.patch(`/categories/${cat._id}/restore`);
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.message || 'Restore failed');
    }
  };

  const startEdit = (cat) => {
    setEditId(cat._id);
    setForm({
      name: cat.name,
      description: cat.description || '',
      parentCategory: cat.parentCategory?._id || cat.parentCategory || '',
      tags: Array.isArray(cat.tags) ? cat.tags : [],
    });
    setTagInput('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm({ name: '', description: '', parentCategory: '', tags: [] });
    setTagInput('');
  };

  // Only top-level categories (excluding the current one being edited) can be parents
  const topLevelCategories = categories.filter(
    (c) => !c.parentCategory && (!editId || c._id !== editId)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Categories & Topic Tags</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Manage hierarchical categories, subcategories, and topic tags to power personalized recommendations
        </p>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-xs">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-theme-purple"></span>
            {editId ? 'Edit Category' : 'Add New Category or Subcategory'}
          </h2>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category Name *
                </label>
                <input
                  id="category-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Cricket, Politics, AI, Technology"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-theme-purple/30 focus:border-theme-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Parent Category (Optional Subcategory Assignment)
                </label>
                <select
                  value={form.parentCategory}
                  onChange={(e) => setForm((f) => ({ ...f, parentCategory: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-theme-purple/30 focus:border-theme-purple bg-white text-slate-700"
                >
                  <option value="">— None (This is a Main Category) —</option>
                  {topLevelCategories.map((c) => (
                    <option key={c._id} value={c._id}>
                      Subcategory of: {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Assign to nest this category under a parent (e.g. "IPL" under "Sports").
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description of coverage or editorial beat"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-theme-purple/30 focus:border-theme-purple"
              />
            </div>

            {/* Topic Tags Editor */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Associated Topic Tags (for Editors & Recommendation Engine)
                </label>
                <span className="text-xs text-slate-400">
                  {form.tags.length} tag{form.tags.length === 1 ? '' : 's'} added
                </span>
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDownTag}
                  placeholder="Type a topic tag (e.g. bcci, election, start-ups) and press Enter or click Add"
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-theme-purple/30 focus:border-theme-purple"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Add Tag
                </button>
              </div>

              {/* Tag Pills */}
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl min-h-[46px] items-center">
                {form.tags.length > 0 ? (
                  form.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-xs"
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="text-slate-400 hover:text-red-500 font-bold ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    No topic tags added yet. Tags will appear as 1-click suggestions in the Post Editor!
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                id="save-category-btn"
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-theme-purple text-white font-bold text-sm rounded-xl hover:bg-purple-600 transition-all hover:shadow-lg hover:shadow-theme-purple/30 disabled:opacity-60"
              >
                {saving ? 'Saving…' : editId ? 'Update Category' : 'Create Category'}
              </button>
              {editId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-6 py-2.5 border border-slate-200 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {isAdmin && (
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
              className="rounded border-gray-300 text-theme-purple focus:ring-theme-purple"
            />
            <span className="text-sm font-medium text-slate-700">Show Archived Categories</span>
          </label>
          <button
            onClick={async () => {
              setSaving(true);
              try {
                const orderedIds = categories.map((c) => c._id);
                await api.post('/categories/reorder', { orderedIds });
                alert('Order saved successfully!');
              } catch (err) {
                alert('Failed to save order');
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving || showDeleted}
            className="px-4 py-2 bg-theme-purple text-white text-xs font-bold rounded-xl hover:bg-purple-600 disabled:opacity-50 transition"
          >
            {saving ? 'Saving...' : 'Save Reorder'}
          </button>
        </div>
      )}

      {/* Category List */}
      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-4xl mb-3">🏷️</p>
            <p className="font-semibold text-slate-700">No categories found</p>
            <p className="text-xs text-slate-400 mt-1">Create your first category above.</p>
          </div>
        ) : (
          <div className="p-4">
            <DragDropContext
              onDragEnd={(result) => {
                if (!result.destination || showDeleted) return;
                const items = Array.from(categories);
                const [reorderedItem] = items.splice(result.source.index, 1);
                items.splice(result.destination.index, 0, reorderedItem);
                setCategories(items);
              }}
            >
              <Droppable droppableId="categories-list">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                    {categories.map((cat, index) => {
                      const isSubcategory = Boolean(cat.parentCategory);
                      const parentName = cat.parentCategory?.name || '';
                      const tagsList = Array.isArray(cat.tags) ? cat.tags : [];

                      return (
                        <Draggable
                          key={cat._id}
                          draggableId={cat._id}
                          index={index}
                          isDragDisabled={showDeleted || !isAdmin}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border bg-white ${
                                isSubcategory ? 'ml-0 sm:ml-8 border-l-4 border-l-theme-purple/60 bg-slate-50/40' : ''
                              } ${
                                snapshot.isDragging
                                  ? 'border-theme-purple shadow-lg ring-2 ring-purple-100'
                                  : 'border-slate-200/80 hover:border-slate-300'
                              } transition-all`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  {...provided.dragHandleProps}
                                  className={`text-slate-400 ${
                                    showDeleted || !isAdmin
                                      ? 'opacity-0 pointer-events-none'
                                      : 'cursor-grab active:cursor-grabbing'
                                  }`}
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                  </svg>
                                </div>

                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-800 text-sm sm:text-base">{cat.name}</h3>
                                    {isSubcategory ? (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-theme-purple border border-purple-100">
                                        Subcategory of {parentName}
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                                        Main Category
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-400 font-mono mt-0.5">{cat.slug}</p>
                                </div>
                              </div>

                              {/* Tags display in list item */}
                              <div className="flex-1 max-w-md">
                                {tagsList.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {tagsList.slice(0, 5).map((tag) => (
                                      <span
                                        key={tag}
                                        className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 text-slate-600 font-medium"
                                      >
                                        #{tag}
                                      </span>
                                    ))}
                                    {tagsList.length > 5 && (
                                      <span className="text-[11px] text-slate-400 self-center">
                                        +{tagsList.length - 5} more
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">No tags</span>
                                )}
                              </div>

                              <div className="flex items-center gap-3 shrink-0 justify-end">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                    cat.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {cat.isActive ? 'Active' : 'Inactive'}
                                </span>

                                {isAdmin && (
                                  <div className="flex items-center gap-1 border-l border-slate-100 pl-3">
                                    {cat.deletedAt ? (
                                      <button
                                        onClick={() => handleRestore(cat)}
                                        className="px-3 py-1.5 text-xs font-bold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition"
                                      >
                                        Restore
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => startEdit(cat)}
                                          className="px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:border-theme-purple hover:text-theme-purple transition"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => handleToggle(cat)}
                                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                                            cat.isActive
                                              ? 'text-slate-600 border border-slate-200 hover:bg-slate-50'
                                              : 'text-emerald-600 border border-emerald-200 hover:bg-emerald-50'
                                          }`}
                                        >
                                          {cat.isActive ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button
                                          onClick={() => handleDelete(cat)}
                                          className="px-2.5 py-1 text-xs font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition"
                                        >
                                          Delete
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        )}
      </div>
    </div>
  );
}
