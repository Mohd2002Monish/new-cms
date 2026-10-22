import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser } from '../features/auth/authSlice.js';
import { chatApi } from '../services/chatApi.js';
import { initSocket, getSocket } from '../services/socket.js';
import { usePresenceTracker } from '../hooks/usePresenceTracker.js';

// Pre-defined channels for newsroom collaboration
const CHANNELS = [
  { id: 'editorial-desk', name: 'editorial-desk', label: 'Editorial Desk', desc: 'Article approvals, edits & drafting' },
  { id: 'urgent-news', name: 'urgent-news', label: 'Urgent & Breaking', desc: 'Immediate coverage & alerts' },
];

export default function ChatPage() {
  const currentUser = useSelector(selectUser);
  const [searchParams, setSearchParams] = useSearchParams();

  // Active presence tracking (Teams-style active/away)
  const { presenceStatus } = usePresenceTracker();

  // Conversation state
  const [activeTab, setActiveTab] = useState({ type: 'channel', id: 'editorial-desk' }); // { type: 'dm'|'channel', id }
  const [staffList, setStaffList] = useState([]);
  const [presenceMap, setPresenceMap] = useState({});
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [typingUsers, setTypingUsers] = useState({});
  const [lightboxImage, setLightboxImage] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Read URL param for direct messaging target
  useEffect(() => {
    const targetUserId = searchParams.get('user');
    if (targetUserId) {
      setActiveTab({ type: 'dm', id: targetUserId });
    }
  }, [searchParams]);

  // Fetch staff list & initial presence
  const loadStaff = async () => {
    try {
      const res = await chatApi.getStaff();
      if (res?.success) {
        setStaffList(res.data);
        const map = {};
        res.data.forEach((u) => {
          if (u.presence) map[u._id] = u.presence;
        });
        setPresenceMap(map);
      }
    } catch (err) {
      console.error('Failed to load staff list:', err);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  // Fetch messages for active conversation
  const loadMessages = async () => {
    setLoadingMessages(true);
    try {
      const params =
        activeTab.type === 'channel'
          ? { channel: activeTab.id }
          : { recipientId: activeTab.id };

      const res = await chatApi.getMessages(params);
      if (res?.success) {
        setMessages(res.data);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadMessages();
    setAttachments([]);
    setText('');

    // Mark as read
    if (activeTab.type === 'dm') {
      chatApi.markAsRead({ senderId: activeTab.id }).catch(() => {});
      const socket = getSocket();
      if (socket) {
        socket.emit('mark_chat_read', { senderId: activeTab.id });
      }
      // Decrement local staff unread count
      setStaffList((prev) =>
        prev.map((s) => (s._id === activeTab.id ? { ...s, unreadCount: 0 } : s))
      );
    }
  }, [activeTab]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, attachments]);

  // Real-time Socket.io listeners
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const socket = initSocket(token);

    // 1. Receive incoming chat message
    const handleReceiveMessage = (msg) => {
      const isForActiveConversation =
        (activeTab.type === 'channel' && msg.channel === activeTab.id) ||
        (activeTab.type === 'dm' &&
          (msg.sender?._id === activeTab.id || msg.recipient === activeTab.id));

      if (isForActiveConversation) {
        setMessages((prev) => [...prev, msg]);
        if (activeTab.type === 'dm' && msg.sender?._id === activeTab.id) {
          socket.emit('mark_chat_read', { senderId: activeTab.id });
        }
      } else if (msg.sender?._id !== currentUser?._id) {
        // Increment unread count in staff list
        setStaffList((prev) =>
          prev.map((s) =>
            s._id === msg.sender?._id
              ? { ...s, unreadCount: (s.unreadCount || 0) + 1, lastMessage: { text: msg.text, createdAt: msg.createdAt, isMine: false } }
              : s
          )
        );
      }
    };

    // 2. Teams-style Presence Update
    const handlePresenceUpdate = (data) => {
      setPresenceMap((prev) => ({
        ...prev,
        [data.userId]: { status: data.status, lastActiveAt: data.lastActiveAt },
      }));
    };

    // 3. User Typing indicator
    const handleUserTyping = (data) => {
      if (data.userId === currentUser?._id) return;

      const isRelevant =
        (activeTab.type === 'channel' && data.channel === activeTab.id) ||
        (activeTab.type === 'dm' && data.userId === activeTab.id);

      if (isRelevant) {
        setTypingUsers((prev) => ({ ...prev, [data.userId]: data.isTyping ? data.userName : null }));
      }
    };

    socket.on('receive_chat_message', handleReceiveMessage);
    socket.on('presence_update', handlePresenceUpdate);
    socket.on('user_typing', handleUserTyping);

    return () => {
      socket.off('receive_chat_message', handleReceiveMessage);
      socket.off('presence_update', handlePresenceUpdate);
      socket.off('user_typing', handleUserTyping);
    };
  }, [activeTab, currentUser]);

  // Handle typing debounce
  const handleTextChange = (e) => {
    setText(e.target.value);

    const socket = getSocket();
    if (!socket) return;

    const payload =
      activeTab.type === 'channel'
        ? { channel: activeTab.id, isTyping: true }
        : { recipientId: activeTab.id, isTyping: true };

    socket.emit('chat_typing', payload);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('chat_typing', { ...payload, isTyping: false });
    }, 2000);
  };

  // Upload file attachments (doc, pdf, audio, video, image)
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadedList = [];
      for (const file of files) {
        const item = await chatApi.uploadAttachment(file, (percent) => {
          setUploadProgress(percent);
        });
        uploadedList.push(item);
      }
      setAttachments((prev) => [...prev, ...uploadedList]);
    } catch (err) {
      alert(`Attachment upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && attachments.length === 0) return;

    const payload = {
      channel: activeTab.type === 'channel' ? activeTab.id : null,
      recipientId: activeTab.type === 'dm' ? activeTab.id : null,
      text: text.trim(),
      attachments,
    };

    setText('');
    setAttachments([]);

    const socket = getSocket();
    if (socket && socket.connected) {
      // Send directly via real-time WebSocket
      socket.emit('send_chat_message', payload, (ack) => {
        if (!ack?.success) {
          console.error('Socket message failed, retrying via REST:', ack?.message);
          chatApi.sendMessage(payload);
        }
      });
      // Clear typing indicator
      socket.emit('chat_typing', { ...payload, isTyping: false });
    } else {
      // Fallback via REST
      try {
        const res = await chatApi.sendMessage(payload);
        if (res?.success) {
          setMessages((prev) => [...prev, res.data]);
        }
      } catch (err) {
        alert('Failed to send message: ' + err.message);
      }
    }
  };

  // Find active participant info
  const activeUser =
    activeTab.type === 'dm' ? staffList.find((s) => s._id === activeTab.id) : null;
  const activePresence = activeUser ? presenceMap[activeUser._id] : null;

  // Active channel info
  const activeChannel =
    activeTab.type === 'channel' ? CHANNELS.find((c) => c.id === activeTab.id) : null;

  return (
    <div className="flex h-[calc(100vh-6.5rem)] rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      {/* ─── Left Sidebar: Staff & Channels ───────────────────────────────── */}
      <div className="w-80 border-r border-slate-200 bg-slate-50/70 flex flex-col flex-shrink-0">
        {/* Sidebar Header with Current User's Presence Status */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
              <span className="text-lg">💬</span> Newsroom Chat
            </h2>
            {/* Teams status pill */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
                presenceStatus === 'active'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  presenceStatus === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="capitalize">{presenceStatus}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            {currentUser?.name} &bull; <span className="font-semibold uppercase">{currentUser?.role}</span>
          </p>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Channels Section */}
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-2 block mb-1">
              Channels
            </span>
            <div className="space-y-1">
              {CHANNELS.map((ch) => {
                const isSelected = activeTab.type === 'channel' && activeTab.id === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setActiveTab({ type: 'channel', id: ch.id });
                      setSearchParams({});
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-theme-purple text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-200/60'
                    }`}
                  >
                    <span className="text-sm opacity-80">#</span>
                    <span className="truncate">{ch.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Direct Messages Section */}
          <div>
            <div className="flex items-center justify-between px-2 mb-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Direct Messages ({staffList.length})
              </span>
            </div>

            <div className="space-y-1">
              {staffList.map((staff) => {
                const isSelected = activeTab.type === 'dm' && activeTab.id === staff._id;
                const presence = presenceMap[staff._id]?.status || 'offline';

                return (
                  <button
                    key={staff._id}
                    onClick={() => {
                      setActiveTab({ type: 'dm', id: staff._id });
                      setSearchParams({ user: staff._id });
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition ${
                      isSelected
                        ? 'bg-purple-100/70 border border-purple-200 text-slate-900'
                        : 'hover:bg-slate-200/50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Avatar with Teams Presence Dot */}
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-slate-200 font-bold text-xs flex items-center justify-center text-slate-700 border border-white">
                          {staff.name.charAt(0).toUpperCase()}
                        </div>
                        {/* 🟢 Active | 🟡 Away | ⚪ Offline */}
                        <span
                          title={presence}
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                            presence === 'active'
                              ? 'bg-emerald-500'
                              : presence === 'away'
                              ? 'bg-amber-400'
                              : 'bg-slate-300'
                          }`}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold truncate">{staff.name}</span>
                          <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-600">
                            {staff.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {presence === 'active' ? (
                            <span className="text-emerald-600 font-medium">Active now</span>
                          ) : presence === 'away' ? (
                            <span className="text-amber-600 font-medium">Away</span>
                          ) : (
                            'Offline'
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Unread message count pill */}
                    {staff.unreadCount > 0 && (
                      <span className="ml-2 flex-shrink-0 bg-theme-purple text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                        {staff.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Right Main Chat View ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {/* Conversation Header */}
        <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            {activeTab.type === 'channel' ? (
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <span className="text-theme-purple">#</span> {activeChannel?.label}
                </h3>
                <p className="text-xs text-slate-400">{activeChannel?.desc}</p>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-theme-purple text-white font-bold flex items-center justify-center text-sm shadow-sm">
                    {activeUser?.name?.charAt(0).toUpperCase()}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      activePresence?.status === 'active'
                        ? 'bg-emerald-500'
                        : activePresence?.status === 'away'
                        ? 'bg-amber-400'
                        : 'bg-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900">{activeUser?.name}</h3>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      {activeUser?.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {activePresence?.status === 'active' ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active in workspace
                      </span>
                    ) : activePresence?.status === 'away' ? (
                      <span className="text-amber-600 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Away (tab in background or idle)
                      </span>
                    ) : (
                      <span className="text-slate-400">Offline</span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40">
          {loadingMessages ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-xs gap-2">
              <span className="animate-spin text-theme-purple text-base">⏳</span> Loading conversation…
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-8">
              <span className="text-4xl mb-2">💬</span>
              <p className="text-sm font-bold text-slate-700">No messages yet</p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Say hello, share breaking story links, or attach editorial documents, images, audio, or video.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine =
                (msg.sender?._id || msg.sender) === currentUser?._id;

              return (
                <div
                  key={msg._id}
                  className={`flex items-start gap-3 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Sender Avatar */}
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                    {(msg.sender?.name || 'User').charAt(0).toUpperCase()}
                  </div>

                  {/* Message Bubble Container */}
                  <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[11px] font-bold text-slate-700">
                        {isMine ? 'You' : msg.sender?.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl shadow-sm space-y-2 ${
                        isMine
                          ? 'bg-theme-purple text-white rounded-tr-none'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                      }`}
                    >
                      {/* Message Text */}
                      {msg.text && (
                        <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                      )}

                      {/* Attachments Section */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="space-y-2 pt-1">
                          {msg.attachments.map((att, idx) => (
                            <div key={idx}>
                              {/* 1. Image Renderer */}
                              {att.fileType === 'image' && (
                                <img
                                  src={att.url}
                                  alt={att.fileName}
                                  onClick={() => setLightboxImage(att.url)}
                                  className="max-h-60 rounded-xl object-cover cursor-pointer hover:opacity-90 transition border border-white/20"
                                />
                              )}

                              {/* 2. Video Renderer */}
                              {att.fileType === 'video' && (
                                <video
                                  src={att.url}
                                  controls
                                  className="max-h-64 rounded-xl w-full bg-black/80"
                                />
                              )}

                              {/* 3. Audio / Voice Note Renderer */}
                              {att.fileType === 'audio' && (
                                <div className="p-2 rounded-xl bg-black/10 flex items-center gap-2">
                                  <audio src={att.url} controls className="w-full h-8" />
                                </div>
                              )}

                              {/* 4. Document / PDF Renderer */}
                              {(att.fileType === 'pdf' || att.fileType === 'doc') && (
                                <div
                                  className={`flex items-center justify-between p-2.5 rounded-xl border ${
                                    isMine
                                      ? 'bg-white/10 border-white/20 text-white'
                                      : 'bg-slate-50 border-slate-200 text-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xl">
                                      {att.fileType === 'pdf' ? '📕' : '📄'}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold truncate max-w-[180px]">{att.fileName}</p>
                                      <p className="text-[10px] opacity-75">
                                        {(att.fileSize / 1024).toFixed(1)} KB
                                      </p>
                                    </div>
                                  </div>

                                  <a
                                    href={att.url}
                                    download={att.fileName}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                                      isMine
                                        ? 'bg-white text-theme-purple hover:bg-slate-100'
                                        : 'bg-theme-purple text-white hover:bg-purple-700'
                                    }`}
                                  >
                                    Download
                                  </a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicator */}
        {Object.values(typingUsers).filter(Boolean).length > 0 && (
          <div className="px-6 py-1 bg-white text-[11px] text-slate-500 italic flex items-center gap-1.5">
            <span className="animate-bounce">✍️</span>
            <span>{Object.values(typingUsers).filter(Boolean).join(', ')} is typing…</span>
          </div>
        )}

        {/* Attachment Previews Tray */}
        {attachments.length > 0 && (
          <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center gap-3 overflow-x-auto">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="relative bg-white border border-slate-300 rounded-xl p-2 flex items-center gap-2 text-xs flex-shrink-0 shadow-sm"
              >
                <span>{att.fileType === 'image' ? '🖼️' : att.fileType === 'audio' ? '🎵' : att.fileType === 'video' ? '🎬' : '📄'}</span>
                <span className="max-w-[120px] truncate font-medium text-slate-700">{att.fileName}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="w-4 h-4 rounded-full bg-slate-200 hover:bg-red-500 hover:text-white flex items-center justify-center text-[10px]"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Progress Bar */}
        {uploading && (
          <div className="px-6 py-2 bg-purple-50 border-t border-purple-100 flex items-center justify-between text-xs text-theme-purple font-semibold">
            <span>Uploading attachment… {uploadProgress}%</span>
            <div className="w-32 bg-purple-200 h-2 rounded-full overflow-hidden">
              <div className="bg-theme-purple h-full transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white flex items-center gap-3">
          {/* Paperclip file upload button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Attach images, documents, PDF, audio or video"
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition flex-shrink-0"
          >
            📎
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={text}
            onChange={handleTextChange}
            placeholder={
              activeTab.type === 'channel'
                ? `Message #${activeChannel?.label}…`
                : `Message ${activeUser?.name || 'Staff'}…`
            }
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-theme-purple/30 focus:border-theme-purple focus:bg-white transition"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!text.trim() && attachments.length === 0) || uploading}
            className="px-5 py-2.5 bg-theme-purple hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 flex-shrink-0"
          >
            <span>Send</span>
            <span>&rarr;</span>
          </button>
        </form>
      </div>

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out"
        >
          <img
            src={lightboxImage}
            alt="Fullscreen preview"
            className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
}
