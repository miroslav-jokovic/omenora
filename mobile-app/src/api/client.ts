import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../constants/config';
import { supabase } from '../lib/supabase';

// Per-request retry bookkeeping (not part of the public Axios config).
type RetryConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;         // 401 refresh-and-retry guard (at most once)
  _netRetryCount?: number;  // connection-error backoff counter
};

const MAX_NET_RETRIES = 2;
const NET_RETRY_BASE_MS = 500;

// Single-flight token refresh: concurrent 401s share one refresh round-trip.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (error || !data.session) return null;
        return data.session.access_token;
      } catch {
        return null;
      } finally {
        // Release the lock on the next tick so a later 401 can refresh again.
        setTimeout(() => { refreshPromise = null; }, 0);
      }
    })();
  }
  return refreshPromise;
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor — attach the current access token.
apiClient.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}` 
    }
  } catch (err) {
    console.warn('[api] Failed to attach auth token:', err)
  }
  return config
})

// Response interceptor — refresh-on-401 and safe connection retry.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;

    if (error.response) {
      console.error('API Error:', error.response.status);

      // Rate limiting — pass through raw so callers can read the response body.
      if (error.response.status === 429) {
        return Promise.reject(error);
      }

      // 401 — try a one-time token refresh, then replay the original request.
      if (error.response.status === 401 && original && !original._retry) {
        original._retry = true;
        const newToken = await refreshAccessToken();
        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(original);
        }
        // Refresh failed → session is gone; AuthProvider re-bootstraps anonymously.
        return Promise.reject(new Error('Authentication required'));
      }
      if (error.response.status === 401) {
        return Promise.reject(new Error('Authentication required'));
      }
    } else if (error.request) {
      // No response received. Retry genuine connection failures only — NOT timeouts
      // (a timed-out request may have been processed; retrying risks double-consuming
      // a monthly cap or a paid Counsel credit). Timeouts fall through to the
      // existing manual "Try again" UI.
      const isTimeout = error.code === 'ECONNABORTED';
      if (!isTimeout && original) {
        original._netRetryCount = (original._netRetryCount ?? 0) + 1;
        if (original._netRetryCount <= MAX_NET_RETRIES) {
          await delay(NET_RETRY_BASE_MS * Math.pow(2, original._netRetryCount - 1));
          return apiClient(original);
        }
      }
      console.error('Network Error');
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }

    return Promise.reject(error);
  }
);

export default apiClient;

export function getErrorBody(err: unknown): { status: number; data: unknown } | null {
  if (axios.isAxiosError(err) && err.response) {
    return { status: err.response.status, data: err.response.data }
  }
  return null
}
