import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../features/auth/authSlice.js';
import api from '../services/api.js';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function Categories() {
  const user = useSelector(selectUser);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const isAdmin = user?.role === 'admin';

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/categories?all=true${showDeleted ? '&showDeleted=true' : ''}`);
      setCategories(data.data);
    } catch (err) {
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, [showDeleted]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      if (editId) {
        await api.patch(`/categories/${editId}`, form);
      } else {
        await api.post('/categories', form);
      }
      setForm({ name: '', description: '' });
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
    setForm({ name: cat.name, description: cat.description || '' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Categories</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage article categories</p>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <div className="absolute top-0 left-0 right-0 h-1" />
          <h2 className="font-bold text-slate-800 mb-4">
            {editId ? 'Edit Category' : 'Add New Category'}
          </h2>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Name *</label>
              <input
                id="category-name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Politics"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-theme-purple/30 focus:border-theme-purple"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional short description"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-theme-purple/30 focus:border-theme-purple"
              />
            </div>
            <div className="flex gap-3">
              <button
                id="save-category-btn"
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-theme-purple text-white font-bold rounded-xl
                  hover:bg-purple-600 transition-all hover:shadow-lg hover:shadow-theme-purple/30 disabled:opacity-60"
              >
                {saving ? 'Saving…' : editId ? 'Update' : 'Create'}
              </button>
              {editId && (
                <button
                  type="button"
                  onClick={() => { setEditId(null); setForm({ name: '', description: '' }); }}
                  className="px-6 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {isAdmin && (
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={showDeleted} 
              onChange={(e) => setShowDeleted(e.target.checked)} 
              className="rounded border-gray-300 text-theme-purple focus:ring-theme-purple"
            />
            <span className="text-sm font-medium text-slate-700">Show Deleted (Trash)</span>
          </label>
          <button
            onClick={async () => {
              setSaving(true);
              try {
                const orderedIds = categories.map(c => c._id);
                await api.post('/categories/reorder', { orderedIds });
                alert('Order saved!');
              } catch (err) {
                alert('Failed to save order');
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving || showDeleted}
            className="px-4 py-2 bg-theme-purple text-white text-sm font-bold rounded-lg hover:bg-purple-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Order'}
          </button>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : categories.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-4xl mb-3">🏷️</p>
            <p className="font-medium">No categories yet.</p>
          </div>
        ) : (
          <div className="p-4">
            <DragDropContext onDragEnd={(result) => {
              if (!result.destination || showDeleted) return;
              const items = Array.from(categories);
              const [reorderedItem] = items.splice(result.source.index, 1);
              items.splice(result.destination.index, 0, reorderedItem);
              setCategories(items);
            }}>
              <Droppable droppableId="categories-list">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {categories.map((cat, index) => (
                      <Draggable key={cat._id} draggableId={cat._id} index={index} isDragDisabled={showDeleted || !isAdmin}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center gap-4 p-4 rounded-xl border bg-white ${snapshot.isDragging ? 'border-theme-purple shadow-lg ring-2 ring-purple-100' : 'border-slate-200 hover:border-slate-300'} transition-all`}
                          >
                            <div {...provided.dragHandleProps} className={`text-slate-400 ${showDeleted || !isAdmin ? 'opacity-0 pointer-events-none' : 'cursor-grab active:cursor-grabbing'}`}>
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                              </svg>
                            </div>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                              <div>
                                <h3 className="font-bold text-slate-800">{cat.name}</h3>
                                <p className="text-xs text-slate-500 font-mono mt-0.5">{cat.slug}</p>
                              </div>
                              <div className="text-sm text-slate-500 line-clamp-1">{cat.description || '—'}</div>
                              <div className="flex items-center gap-3">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0
                                  ${cat.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                  {cat.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </div>
                            
                            {isAdmin && (
                              <div className="flex items-center gap-2 shrink-0 border-l border-slate-100 pl-4 ml-2">
                                {cat.deletedAt ? (
                                  <button
                                    onClick={() => handleRestore(cat)}
                                    className="px-3 py-1.5 text-xs font-bold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                                  >
                                    Restore
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => startEdit(cat)}
                                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200
                                        rounded-lg hover:border-theme-purple hover:text-theme-purple transition-colors"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleToggle(cat)}
                                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors
                                        ${cat.isActive
                                          ? 'text-slate-600 border border-slate-200 hover:bg-slate-50'
                                          : 'text-emerald-600 border border-emerald-200 hover:bg-emerald-50'
                                        }`}
                                    >
                                      {cat.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button
                                      onClick={() => handleDelete(cat)}
                                      className="px-3 py-1.5 text-xs font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
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
