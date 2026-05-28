import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../services/api.js';
import { selectUser } from '../features/auth/authSlice.js';

export default function SliderManager() {
  const user = useSelector(selectUser);
  const [sliderPosts, setSliderPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSliderPosts();
  }, []);

  const fetchSliderPosts = async () => {
    try {
      // Need a custom endpoint or we can fetch all posts and filter, but the best way is using the public endpoint with isSlider=true, or admin post endpoint
      // Let's use the admin post endpoint and fetch all. We should probably just fetch them using the public API which is easier, or admin API.
      // Wait, there is no admin API specifically for slider posts, but we can filter on the client or update the admin endpoint.
      // We didn't add isSlider filter to the admin endpoint getPosts. Let's do that or just fetch public ones for the slider manager.
      // Since it's admin, we should fetch from admin API.
      const { data } = await api.get('/posts?limit=1000'); // Fetch enough posts
      const sliders = data.data.filter(p => p.isSlider).sort((a, b) => (a.sliderOrder || 0) - (b.sliderOrder || 0));
      setSliderPosts(sliders);
    } catch (err) {
      setError('Failed to fetch slider posts');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(sliderPosts);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSliderPosts(items);
  };

  const saveOrder = async () => {
    setSaving(true);
    setError(null);
    try {
      const orderedIds = sliderPosts.map(p => p._id);
      await api.post('/posts/reorder-slider', { orderedIds });
      alert('Slider order saved successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save order');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'admin') {
    return <div className="p-8 text-center text-slate-500">Access Denied. Admins only.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900">Slider Manager</h1>
        <button
          onClick={saveOrder}
          disabled={saving || loading}
          className="px-5 py-2.5 bg-theme-purple text-white font-bold rounded-xl hover:bg-purple-600 transition-all shadow-md disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Order'}
        </button>
      </div>

      {error && <div className="text-red-500 bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>}

      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <p className="text-sm text-slate-500 mb-6">
          Drag and drop the articles below to reorder how they appear in the public frontend's main hero slider.
        </p>

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin w-8 h-8 border-4 border-theme-purple border-t-transparent rounded-full" />
          </div>
        ) : sliderPosts.length === 0 ? (
          <div className="text-center p-8 text-slate-500">
            No articles are currently set to show in the main slider. Edit an article and check "Show in Main Slider".
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="slider-list">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {sliderPosts.map((post, index) => (
                    <Draggable key={post._id} draggableId={post._id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`flex items-center gap-4 p-4 rounded-xl border bg-white ${snapshot.isDragging ? 'border-theme-purple shadow-lg ring-2 ring-purple-100' : 'border-slate-200 hover:border-slate-300'} transition-all`}
                        >
                          <div className="text-slate-400 cursor-grab active:cursor-grabbing">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                            </svg>
                          </div>
                          {post.featuredImage?.url ? (
                            <img src={post.featuredImage.url} alt={post.title} className="w-16 h-12 object-cover rounded-md" />
                          ) : (
                            <div className="w-16 h-12 bg-slate-100 rounded-md flex items-center justify-center text-xs text-slate-400">No Img</div>
                          )}
                          <div className="flex-1">
                            <h3 className="font-bold text-slate-800 line-clamp-1">{post.title}</h3>
                            <p className="text-xs text-slate-500">
                              {new Date(post.publishedAt || post.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}
