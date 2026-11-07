import axios from 'axios';
import { Platform } from 'react-native';
import storage from '../utils/storage';

// Production Vercel live backend URL with local fallback
const DEFAULT_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://newscrm.vercel.app/api';

let customApiUrl = null;

export async function initApiUrl() {
  try {
    const saved = await storage.getItem('custom_api_url');
    if (saved && saved.trim()) {
      customApiUrl = saved.trim();
    }
  } catch (_) {}
}

export async function setCustomApiUrl(url) {
  if (url && url.trim()) {
    customApiUrl = url.trim();
    await storage.setItem('custom_api_url', url.trim());
  } else {
    customApiUrl = null;
    await storage.removeItem('custom_api_url');
  }
}

export function getBaseUrl() {
  return customApiUrl || DEFAULT_URL;
}

const client = axios.create({
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Dynamic baseURL interceptor
client.interceptors.request.use(async (config) => {
  config.baseURL = getBaseUrl();
  const token = await storage.getItem('reader_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;

