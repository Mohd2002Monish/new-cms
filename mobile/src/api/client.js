import axios from 'axios';
import { Platform } from 'react-native';
import storage from '../utils/storage';
import logger from '../utils/logger';

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
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

let inMemoryToken = null;

export function setAuthToken(token) {
  inMemoryToken = token;
}

// Dynamic baseURL and fast in-memory token lookup
client.interceptors.request.use(async (config) => {
  config.baseURL = getBaseUrl();
  const token = inMemoryToken || (await storage.getItem('reader_token'));
  if (token) {
    if (!inMemoryToken) inMemoryToken = token;
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response & error logger interceptors
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status || 'NO_RESPONSE';
    const method = error.config?.method?.toUpperCase() || 'REQ';
    const url = error.config?.url || '';
    const msg = error.response?.data?.message || error.message;
    logger.error('API_ERR', `${method} ${url} [${status}]: ${msg}`);
    return Promise.reject(error);
  }
);

export default client;

