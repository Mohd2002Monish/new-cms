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
  const [pendingFile, setPendingFile] = useState(null);

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
    if (file && file.type.startsWith('image/')) {
      setPendingFile(file);
    } else {
      handleFileUpload(file);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setPendingFile(file);
    } else {
      handleFileUpload(file);
    }
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

      {pendingFile && (
        <ImageEditorModal
          file={pendingFile}
          onClose={() => setPendingFile(null)}
          onSave={(croppedFile) => {
            setPendingFile(null);
            handleFileUpload(croppedFile);
          }}
        />
      )}
    </div>
  );
}

// ─── Image Editor Modal with Zoom/Pan & Simulated Previews ───────────────────

function ImageEditorModal({ file, onClose, onSave }) {
  const [imgSrc, setImgSrc] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9'); // '16:9', '1:1', 'original'
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const imgRef = useRef(null);
  const viewportRef = useRef(null);

  useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImgSrc(reader.result);
    reader.readAsDataURL(file);
  }, [file]);

  const updateViewportSize = () => {
    if (viewportRef.current) {
      setViewport({
        width: viewportRef.current.clientWidth,
        height: viewportRef.current.clientHeight,
      });
    }
  };

  useEffect(() => {
    if (imgSrc) {
      const timer = setTimeout(() => {
        updateViewportSize();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [aspectRatio, imgSrc]);

  const onImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    setImgDimensions({ width: naturalWidth, height: naturalHeight });
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    // Run an immediate measure
    if (viewportRef.current) {
      setViewport({
        width: viewportRef.current.clientWidth,
        height: viewportRef.current.clientHeight,
      });
    }
  };

  const clampPos = (x, y, zoomVal) => {
    if (!viewport.width || !imgDimensions.width) return { x: 0, y: 0 };
    const initScaleVal = Math.max(viewport.width / imgDimensions.width, viewport.height / imgDimensions.height);
    const scaleVal = initScaleVal * zoomVal;
    const curW = imgDimensions.width * scaleVal;
    const curH = imgDimensions.height * scaleVal;

    const minX = viewport.width - curW;
    const minY = viewport.height - curH;

    return {
      x: Math.min(0, Math.max(minX, x)),
      y: Math.min(0, Math.max(minY, y)),
    };
  };

  const handleZoomChange = (newZoom) => {
    setZoom(newZoom);
    setPosition(prev => clampPos(prev.x, prev.y, newZoom));
  };

  const initScale = imgDimensions.width && imgDimensions.height && viewport.width
    ? Math.max(viewport.width / imgDimensions.width, viewport.height / imgDimensions.height)
    : 1;
  const currentScale = initScale * zoom;
  const currentWidth = imgDimensions.width * currentScale;
  const currentHeight = imgDimensions.height * currentScale;

  const handleMouseDown = (e) => {
    if (aspectRatio === 'original') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setPosition(clampPos(newX, newY, zoom));
  };

  const handleTouchStart = (e) => {
    if (aspectRatio === 'original') return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;
    setPosition(clampPos(newX, newY, zoom));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getPreviewImageStyle = (cardWidth, cardHeight) => {
    if (aspectRatio === 'original') {
      return {
        subContainerStyle: {
          width: '100%',
          height: '100%',
          position: 'relative',
        },
        imageStyle: {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }
      };
    }

    const cropW = viewport.width || 1;
    const cropH = viewport.height || 1;

    const scaleFactor = Math.max(cardWidth / cropW, cardHeight / cropH);

    const subW = cropW * scaleFactor;
    const subH = cropH * scaleFactor;

    const subL = (cardWidth - subW) / 2;
    const subT = (cardHeight - subH) / 2;

    return {
      subContainerStyle: {
        position: 'absolute',
        width: `${subW}px`,
        height: `${subH}px`,
        left: `${subL}px`,
        top: `${subT}px`,
        overflow: 'hidden',
      },
      imageStyle: {
        position: 'absolute',
        width: `${currentWidth * scaleFactor}px`,
        height: `${currentHeight * scaleFactor}px`,
        left: `${position.x * scaleFactor}px`,
        top: `${position.y * scaleFactor}px`,
        maxWidth: 'none',
      }
    };
  };

  const handleCrop = () => {
    if (aspectRatio === 'original') {
      onSave(file);
      return;
    }

    const canvas = document.createElement('canvas');
    const canvasWidth = aspectRatio === '16:9' ? 1280 : 600;
    const canvasHeight = aspectRatio === '16:9' ? 720 : 600;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const canvasScale = canvasWidth / viewport.width;

    const drawWidth = currentWidth * canvasScale;
    const drawHeight = currentHeight * canvasScale;
    const drawX = position.x * canvasScale;
    const drawY = position.y * canvasScale;

    ctx.drawImage(imgRef.current, drawX, drawY, drawWidth, drawHeight);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const croppedFile = new File([blob], file.name, {
        type: file.type,
        lastModified: Date.now(),
      });
      onSave(croppedFile);
    }, file.type);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden max-h-[95vh] border border-slate-100 animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">✂️ Image Crop & Editor</h3>
            <p className="text-xs text-slate-500 mt-0.5">Optimize size and focal region before saving to library</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-slate-500 hover:bg-slate-200 transition-colors shadow-sm text-lg font-bold"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8 min-h-0">
          {/* Left Column: Crop viewport */}
          <div className="flex-1 flex flex-col gap-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Crop Viewport</span>

            <div 
              ref={viewportRef}
              className="relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden select-none cursor-move flex items-center justify-center"
              style={{
                width: '100%',
                aspectRatio: aspectRatio === '16:9' ? '16/9' : aspectRatio === '1:1' ? '1/1' : '4/3', // backup ratio
                maxHeight: '360px',
                touchAction: 'none',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
            >
              {imgSrc && (
                <img
                  ref={imgRef}
                  src={imgSrc}
                  alt="Crop target"
                  onLoad={onImageLoad}
                  className="absolute pointer-events-none max-w-none"
                  style={aspectRatio === 'original' ? {
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    position: 'static',
                  } : {
                    width: `${currentWidth}px`,
                    height: `${currentHeight}px`,
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                  }}
                />
              )}

              {aspectRatio !== 'original' && (
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/20">
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-b border-white/20"></div>
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-b border-white/20"></div>
                  <div className="border-r border-white/20"></div>
                  <div className="border-r border-white/20"></div>
                  <div></div>
                </div>
              )}
            </div>

            {/* Aspect Ratio Presets */}
            <div className="space-y-2">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Select Aspect Ratio</span>
              <div className="flex gap-2.5">
                {[
                  { id: '16:9', label: 'Landscape (16:9)', desc: 'For Featured post image' },
                  { id: '1:1', label: 'Square (1:1)', desc: 'For sidebar thumbnails' },
                  { id: 'original', label: 'Original', desc: 'No crop' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setAspectRatio(item.id)}
                    className={`flex-1 p-3 rounded-xl border text-left transition-all ${aspectRatio === item.id ? 'border-theme-purple bg-theme-purple/5 ring-2 ring-theme-purple/10 font-bold' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    <div className="text-xs text-slate-800">{item.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 leading-normal">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Zoom Slider */}
            {aspectRatio !== 'original' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Zoom</span>
                  <span className="text-xs font-bold text-slate-700">{(zoom * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-400 select-none">➖</span>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={zoom}
                    onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                    className="flex-1 accent-theme-purple cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                  />
                  <span className="text-xs text-slate-400 select-none">➕</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Previews */}
          <div className="w-full md:w-80 flex flex-col gap-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Website Previews</span>

            <div className="flex-1 flex flex-col gap-5 overflow-y-auto max-h-[460px] pr-1">
              {/* Homepage Card Preview */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Home Page Grid (16:9)</span>
                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col w-full">
                  <div className="relative aspect-video bg-slate-100 overflow-hidden w-full">
                    {imgSrc ? (
                      <div style={getPreviewImageStyle(320, 180).subContainerStyle}>
                        <img
                          src={imgSrc}
                          alt="Homepage Preview"
                          style={getPreviewImageStyle(320, 180).imageStyle}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full bg-slate-100" />
                    )}
                    <span className="absolute top-2 left-2 bg-red-600 text-[8px] font-black text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Breaking</span>
                  </div>
                  <div className="p-3.5 space-y-1.5">
                    <span className="text-[9px] font-extrabold text-theme-purple uppercase tracking-wider">Politics</span>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug">Simulated Live Preview of Article Homepage Card</h4>
                    <div className="flex items-center gap-1 text-[9px] text-slate-400">
                      <span>Author Name</span>
                      <span>·</span>
                      <span>3 min read</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar Thumbnail Preview */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trending Sidebar Thumb (1:1)</span>
                <div className="border border-slate-100 rounded-2xl p-3 bg-white shadow-sm flex items-center gap-3">
                  <span className="text-base font-black text-red-600/30">1</span>
                  <div className="relative w-12 h-12 rounded bg-slate-100 overflow-hidden shrink-0">
                    {imgSrc && (
                      <div style={getPreviewImageStyle(48, 48).subContainerStyle}>
                        <img
                          src={imgSrc}
                          alt="Sidebar Preview"
                          style={getPreviewImageStyle(48, 48).imageStyle}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-[11px] font-bold text-slate-800 truncate">Trending article sidebar thumb preview title</p>
                    <p className="text-[9px] text-slate-400 font-medium">10,240 views</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave(file)}
            className="py-2.5 px-4 bg-slate-100 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-200 transition-colors"
          >
            Upload Original
          </button>
          <button 
            onClick={handleCrop}
            className="flex-[2] py-2.5 bg-theme-purple hover:bg-purple-600 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-purple-600/10"
          >
            Crop & Upload
          </button>
        </div>
      </div>
    </div>
  );
}
