import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
import storage from '../utils/storage';
import authApi from '../api/authApi';
import { setAuthToken } from '../api/client';
import { safeJsonParse } from '../utils/formatters';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState([]);

  // Initialize auth state from storage
  useEffect(() => {
    async function loadAuth() {
      try {
        const savedToken = await storage.getItem('reader_token');
        const savedBookmarks = await storage.getItem('reader_bookmarks');
        if (savedBookmarks) {
          const parsed = safeJsonParse(savedBookmarks, []);
          setBookmarks(Array.isArray(parsed) ? parsed : []);
        }
        if (savedToken) {
          setAuthToken(savedToken);
          setToken(savedToken);
          const profile = await authApi.getProfile();
          if (profile) {
            setUser(profile);
            if (Array.isArray(profile.bookmarks)) {
              setBookmarks(profile.bookmarks);
              await storage.setItem('reader_bookmarks', JSON.stringify(profile.bookmarks));
            }
          }
        }
      } catch (err) {
        console.warn('Auth restoration failed:', err?.message);
      } finally {
        setLoading(false);
      }
    }
    loadAuth();
  }, []);

  const loginPassword = async ({ email, password }) => {
    const res = await authApi.loginPassword({ email, password });
    if (res?.success && res.token) {
      setAuthToken(res.token);
      setToken(res.token);
      setUser(res.data?.user || res.data || { email });
      await storage.setItem('reader_token', res.token);
      return { success: true };
    }
    return { success: false, message: res?.message || 'Login failed' };
  };

  const loginOtp = async ({ email, otp }) => {
    const res = await authApi.loginOtp({ email, otp });
    if (res?.success && res.token) {
      setAuthToken(res.token);
      setToken(res.token);
      setUser(res.data?.user || res.data || { email });
      await storage.setItem('reader_token', res.token);
      return { success: true };
    }
    return { success: false, message: res?.message || 'Invalid OTP code' };
  };

  const sendOtp = async ({ email }) => {
    return await authApi.sendOtp({ email });
  };

  const register = async ({ name, email, password }) => {
    const res = await authApi.register({ name, email, password });
    if (res?.success && res.token) {
      setAuthToken(res.token);
      setToken(res.token);
      setUser(res.data?.user || res.data || { name, email });
      await storage.setItem('reader_token', res.token);
      return { success: true };
    }
    return { success: false, message: res?.message || 'Registration failed' };
  };

  const loginWithGoogleToken = async (authToken, googleName = null) => {
    if (!authToken) return { success: false, message: 'No authentication token provided' };
    try {
      setAuthToken(authToken);
      setToken(authToken);
      await storage.setItem('reader_token', authToken);
      const profile = await authApi.getProfile().catch(() => null);
      const userData = profile || { name: googleName || 'Google Reader' };
      setUser(userData);
      if (Array.isArray(profile?.bookmarks)) {
        setBookmarks(profile.bookmarks);
        await storage.setItem('reader_bookmarks', JSON.stringify(profile.bookmarks));
      }
      return { success: true, user: userData };
    } catch (err) {
      console.warn('loginWithGoogleToken failed:', err?.message);
      return { success: false, message: err?.message || 'Failed to authenticate Google account' };
    }
  };

  const logout = async () => {
    setAuthToken(null);
    setUser(null);
    setToken(null);
    await storage.removeItem('reader_token');
  };

  // Listen for OAuth return deep-links (e.g. dailychronicle://oauth?google_token=...)
  useEffect(() => {
    const handleDeepLink = async (event) => {
      const url = event?.url;
      if (!url || !url.startsWith('dailychronicle://oauth')) return;
      try {
        const queryString = url.split('?')[1] || '';
        const params = new URLSearchParams(queryString);
        const googleToken = params.get('google_token');
        const googleName = params.get('google_name');
        if (googleToken) {
          await loginWithGoogleToken(googleToken, googleName);
        }
      } catch (_) {}
    };

    const sub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((initUrl) => {
      if (initUrl) handleDeepLink({ url: initUrl });
    });

    return () => sub.remove();
  }, [loginWithGoogleToken]);

  const toggleBookmark = useCallback(async (slug) => {
    if (!slug) return;
    setBookmarks((prev) => {
      const exists = prev.includes(slug);
      const next = exists ? prev.filter((s) => s !== slug) : [...prev, slug];
      storage.setItem('reader_bookmarks', JSON.stringify(next));
      return next;
    });

    if (token) {
      try {
        await authApi.toggleBookmark(slug);
      } catch (_) {}
    }
  }, [token]);

  const isBookmarked = useCallback((slug) => {
    return bookmarks.includes(slug);
  }, [bookmarks]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        loading,
        bookmarks,
        loginPassword,
        loginOtp,
        sendOtp,
        register,
        loginWithGoogleToken,
        logout,
        toggleBookmark,
        isBookmarked,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

