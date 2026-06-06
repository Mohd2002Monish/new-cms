'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { publicApi } from '../lib/api';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Initialize and check for existing token or session refresh
  const initializeAuth = useCallback(async () => {
    try {
      const storedToken = localStorage.getItem('reader_token');
      if (storedToken) {
        // We have an access token, attempt a silent refresh to verify it's valid
        // or just attempt to get user info if we had a profile endpoint.
        // Let's use the refresh endpoint which doesn't require active Bearer token in headers.
        const res = await api.post('/auth/refresh').catch(() => null);
        if (res?.data?.success) {
          localStorage.setItem('reader_token', res.data.data.accessToken);
          setUser(res.data.data.user);
        } else {
          // Token expired or refresh token invalid
          localStorage.removeItem('reader_token');
          setUser(null);
        }
      } else {
        // No token, but maybe we have a refresh cookie? Try refresh.
        const res = await api.post('/auth/refresh').catch(() => null);
        if (res?.data?.success) {
          localStorage.setItem('reader_token', res.data.data.accessToken);
          setUser(res.data.data.user);
        }
      }
    } catch (err) {
      console.error('Auth initialization failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Login with Email + Password
  const loginWithPassword = async (email, password) => {
    setLoading(true);
    try {
      const res = await publicApi.loginPassword({ email, password });
      if (res?.success) {
        localStorage.setItem('reader_token', res.data.accessToken);
        setUser(res.data.user);
        setAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, message: res?.message || 'Login failed' };
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || 'Invalid email or password' };
    } finally {
      setLoading(false);
    }
  };

  // Send Login/Reset OTP
  const sendLoginOtp = async (email) => {
    try {
      const res = await publicApi.sendOtp({ email });
      if (res?.success) {
        return { success: true, message: res.message };
      }
      return { success: false, message: res?.message || 'Failed to send OTP' };
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || 'Failed to send OTP' };
    }
  };

  // Login with OTP
  const loginWithOtp = async (email, otp) => {
    setLoading(true);
    try {
      const res = await publicApi.loginOtp({ email, otp });
      if (res?.success) {
        localStorage.setItem('reader_token', res.data.accessToken);
        setUser(res.data.user);
        setAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, message: res?.message || 'Login failed' };
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || 'Invalid or expired OTP' };
    } finally {
      setLoading(false);
    }
  };

  // Register Reader
  const register = async (name, email, password) => {
    setLoading(true);
    try {
      const res = await publicApi.registerReader({ name, email, password });
      if (res?.success) {
        localStorage.setItem('reader_token', res.data.accessToken);
        setUser(res.data.user);
        setAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, message: res?.message || 'Registration failed' };
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || 'Failed to register account' };
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password
  const forgotPassword = async (email) => {
    try {
      const res = await publicApi.forgotPassword({ email });
      if (res?.success) {
        return { success: true, message: res.message };
      }
      return { success: false, message: res?.message || 'Failed to request reset' };
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || 'Email not found' };
    }
  };

  // Reset Password
  const resetPassword = async (email, otp, newPassword) => {
    try {
      const res = await publicApi.resetPassword({ email, otp, newPassword });
      if (res?.success) {
        return { success: true, message: res.message };
      }
      return { success: false, message: res?.message || 'Failed to reset password' };
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || 'Invalid or expired OTP' };
    }
  };

  // Logout Reader
  const logout = async () => {
    setLoading(true);
    try {
      await api.post('/auth/logout').catch(() => null);
    } finally {
      localStorage.removeItem('reader_token');
      setUser(null);
      setLoading(false);
    }
  };

  const refreshUser = useCallback(async () => {
    try {
      const res = await publicApi.getProfile();
      if (res?.success) {
        setUser(res.data);
      }
    } catch (err) {
      console.error('Failed to refresh user profile', err);
    }
  }, []);

  const updateTrackingEnabled = async (enabled) => {
    try {
      const res = await publicApi.toggleTracking(enabled);
      if (res?.success) {
        setUser(prev => prev ? { ...prev, trackingEnabled: res.trackingEnabled } : null);
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || 'Failed to toggle tracking' };
    }
  };

  const subscribe = async () => {
    try {
      const res = await publicApi.subscribe();
      if (res?.success) {
        setUser(prev => prev ? { ...prev, isPremiumUser: true } : null);
        return { success: true, message: res.message };
      }
      return { success: false };
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || 'Mock subscription failed' };
    }
  };

  const unsubscribe = async () => {
    try {
      const res = await publicApi.unsubscribe();
      if (res?.success) {
        setUser(prev => prev ? { ...prev, isPremiumUser: false, monthlyViewsCount: 0 } : null);
        return { success: true, message: res.message };
      }
      return { success: false };
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || 'Mock cancel failed' };
    }
  };

  const openAuthModal = () => setAuthModalOpen(true);
  const closeAuthModal = () => setAuthModalOpen(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authModalOpen,
        openAuthModal,
        closeAuthModal,
        loginWithPassword,
        sendLoginOtp,
        loginWithOtp,
        register,
        forgotPassword,
        resetPassword,
        logout,
        refreshUser,
        updateTrackingEnabled,
        subscribe,
        unsubscribe,
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
