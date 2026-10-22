import api from './api.js';

export const chatApi = {
  /**
   * Fetch all staff users with unread counts and presence.
   */
  getStaff: async () => {
    const res = await api.get('/chat/staff');
    return res.data;
  },

  /**
   * Fetch conversation messages.
   */
  getMessages: async (params) => {
    const res = await api.get('/chat/messages', { params });
    return res.data;
  },

  /**
   * Sign Cloudinary upload for attachments.
   */
  signUpload: async (fileType) => {
    const res = await api.post('/chat/sign-upload', { fileType });
    return res.data;
  },

  /**
   * Send a chat message via REST (fallback).
   */
  sendMessage: async (data) => {
    const res = await api.post('/chat/send', data);
    return res.data;
  },

  /**
   * Mark messages as read.
   */
  markAsRead: async (data) => {
    const res = await api.patch('/chat/mark-read', data);
    return res.data;
  },

  /**
   * Upload an attachment directly to Cloudinary.
   * Supports: Images, Videos, Audio, PDFs, Word docs, spreadsheets.
   */
  uploadAttachment: async (file, onProgress) => {
    // 1. Determine file type
    let fileType = 'doc';
    if (file.type.startsWith('image/')) {
      fileType = 'image';
    } else if (file.type.startsWith('video/')) {
      fileType = 'video';
    } else if (file.type.startsWith('audio/')) {
      fileType = 'audio';
    } else if (file.type === 'application/pdf') {
      fileType = 'pdf';
    }

    // 2. Get upload signature from backend
    const signRes = await api.post('/chat/sign-upload', { fileType });
    const { signature, timestamp, cloud_name, api_key, folder, resourceType } = signRes.data.data;

    // 3. Upload to Cloudinary endpoint
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', api_key);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('folder', folder);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloud_name}/${resourceType}/upload`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl);

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const result = JSON.parse(xhr.responseText);
          resolve({
            url: result.secure_url || result.url,
            fileType,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || 'application/octet-stream',
            publicId: result.public_id,
          });
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(formData);
    });
  },
};
