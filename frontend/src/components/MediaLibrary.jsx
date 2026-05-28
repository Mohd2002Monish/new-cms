import { useState, useEffect, useRef } from 'react';
import api from '../services/api.js';

export default function MediaLibrary({ onSelect, pickerMode = false }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedAsset, setSelectedAsset] = useState(null); // For detail view
  
  // Drag state
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const fetchAssets = async (pageNum = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get('/media', { params: { page: pageNum, search } });
      setAssets(data.data);
      setTotalPages(data.pagination.pages);
      setPage(data.pagination.page);
    } catch (err) {
      console.error('Failed to fetch media:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets(1);
  }, [search]);

  // Upload logic
  const handleFileUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(true);
    
    try {
      // 1. Get signature
      const { data: signRes } = await api.post('/media/sign', { folder: 'news-cms' });
      const { signature, timestamp, cloud_name, api_key, folder } = signRes.data;

      // 2. Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', api_key);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('folder', folder);

      const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!cloudinaryRes.ok) {
        throw new Error('Cloudinary upload failed');
      }

      const uploadData = await cloudinaryRes.json();

      // 3. Register in Backend
      await api.post('/media', {
        fileName: file.name,
        cloudinaryPublicId: uploadData.public_id,
        url: uploadData.secure_url,
        thumbnailUrl: uploadData.secure_url.replace('/upload/', '/upload/c_thumb,w_200,h_200/'),
        mimeType: file.type,
        sizeBytes: uploadData.bytes,
        width: uploadData.width,
        height: uploadData.height,
      });

      // Refresh
      fetchAssets(1);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFileUpload(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    handleFileUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this asset permanently?')) return;
    try {
      await api.delete(`/media/${id}`);
      setSelectedAsset(null);
      fetchAssets(page);
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleUpdate = async (id, payload) => {
    try {
      const { data } = await api.patch(`/media/${id}`, payload);
      setAssets(assets.map(a => a._id === id ? data.data : a));
      if (selectedAsset && selectedAsset._id === id) {
        setSelectedAsset(data.data);
      }
    } catch (err) {
      alert('Failed to update asset');
    }
  };

  return (
    <div className={`flex flex-col h-full ${pickerMode ? 'bg-white' : ''}`}>
      {/* Header & Search */}
      <div className="flex flex-wrap gap-4 items-center justify-between mb-6 p-1">
        <div>
          <h2 className="text-xl font-black text-slate-800">Media Library</h2>
          <p className="text-sm text-slate-500">Manage and reuse your uploaded images.</p>
        </div>
        
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-theme-purple/30 w-64"
          />
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            className="hidden" 
            onChange={handleFileChange} 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-theme-purple text-white text-sm font-bold rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {uploading ? 'Uploading...' : '📤 Upload New'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Main Grid */}
        <div 
          className={`flex-1 overflow-y-auto border-2 rounded-2xl p-4 transition-colors ${isDragOver ? 'border-dashed border-theme-purple bg-theme-purple/5' : 'border-slate-100 bg-slate-50'}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          {loading ? (
            <div className="flex justify-center p-10"><div className="animate-spin w-8 h-8 border-4 border-theme-purple border-t-transparent rounded-full" /></div>
          ) : assets.length === 0 ? (
            <div className="text-center p-20 text-slate-400">
              <p>No media found.</p>
              <p className="text-sm mt-2">Drag & drop images here to upload.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {assets.map(asset => (
                <div 
                  key={asset._id}
                  onClick={() => setSelectedAsset(asset)}
                  className={`relative group bg-white rounded-xl border overflow-hidden cursor-pointer hover:shadow-md transition-all ${selectedAsset?._id === asset._id ? 'border-theme-purple ring-2 ring-theme-purple/20' : 'border-slate-200'}`}
                >
                  <div className="aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
                    <img 
                      src={asset.thumbnailUrl} 
                      alt={asset.altText || asset.fileName} 
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-2 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-700 truncate" title={asset.fileName}>{asset.fileName}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{(asset.sizeBytes / 1024).toFixed(1)} KB • {asset.width}x{asset.height}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button disabled={page === 1} onClick={() => fetchAssets(page - 1)} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm disabled:opacity-50">Prev</button>
              <span className="px-3 py-1 text-sm text-slate-600 font-medium">Page {page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => fetchAssets(page + 1)} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm disabled:opacity-50">Next</button>
            </div>
          )}
        </div>

        {/* Sidebar Detail View */}
        {selectedAsset && (
          <div className="w-80 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 overflow-y-auto shadow-sm">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-slate-800">Asset Details</h3>
              <button onClick={() => setSelectedAsset(null)} className="text-slate-400 hover:text-slate-700">×</button>
            </div>
            
            <a href={selectedAsset.url} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-slate-200 bg-slate-50 relative group">
              <img src={selectedAsset.url} alt="Preview" className="w-full h-auto" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold">Open Full Size</div>
            </a>
            
            <div className="space-y-1 text-xs text-slate-600">
              <p><span className="font-semibold">Name:</span> <span className="break-all">{selectedAsset.fileName}</span></p>
              <p><span className="font-semibold">Size:</span> {(selectedAsset.sizeBytes / 1024).toFixed(1)} KB</p>
              <p><span className="font-semibold">Dimensions:</span> {selectedAsset.width} x {selectedAsset.height}</p>
              <p><span className="font-semibold">Uploaded By:</span> {selectedAsset.uploadedBy?.name}</p>
              <p><span className="font-semibold">Date:</span> {new Date(selectedAsset.createdAt).toLocaleDateString()}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Alt Text</label>
                <input 
                  type="text" 
                  value={selectedAsset.altText} 
                  onChange={(e) => handleUpdate(selectedAsset._id, { altText: e.target.value })}
                  placeholder="Describe image for SEO..."
                  className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-theme-purple"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tags (comma separated)</label>
                <input 
                  type="text" 
                  value={selectedAsset.tags.join(', ')} 
                  onChange={(e) => {
                    const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                    handleUpdate(selectedAsset._id, { tags });
                  }}
                  placeholder="e.g. hero, background, logo"
                  className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-theme-purple"
                />
              </div>
            </div>

            <div className="mt-auto pt-4 flex flex-col gap-2">
              {pickerMode && (
                <button 
                  onClick={() => onSelect(selectedAsset)}
                  className="w-full py-2 bg-theme-purple text-white font-bold rounded-lg hover:bg-purple-600 transition-colors"
                >
                  Insert Image
                </button>
              )}
              <button 
                onClick={() => handleDelete(selectedAsset._id)}
                className="w-full py-2 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 transition-colors"
              >
                Delete Asset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
