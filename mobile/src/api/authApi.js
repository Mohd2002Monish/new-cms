import client from './client';

export const authApi = {
  async loginPassword({ email, password }) {
    const res = await client.post('/public/auth/login-password', { email, password });
    return res.data;
  },

  async sendOtp({ email }) {
    const res = await client.post('/public/auth/send-otp', { email });
    return res.data;
  },

  async loginOtp({ email, otp }) {
    const res = await client.post('/public/auth/login-otp', { email, otp });
    return res.data;
  },

  async register({ name, email, password }) {
    const res = await client.post('/public/auth/register', { name, email, password });
    return res.data;
  },

  async getGoogleConfig() {
    const res = await client.get('/public/auth/google/config');
    return res.data?.data || null;
  },

  async googleAuth({ credential, code }) {
    const res = await client.post('/public/auth/google', { credential, code });
    return res.data;
  },

  async getProfile() {
    const res = await client.get('/public/user/me');
    return res.data?.data || null;
  },

  async getBookmarks() {
    const res = await client.get('/public/user/bookmarks');
    return res.data?.data || [];
  },

  async toggleBookmark(slug) {
    const res = await client.post('/public/user/bookmarks', { slug });
    return res.data;
  },
};

export default authApi;

