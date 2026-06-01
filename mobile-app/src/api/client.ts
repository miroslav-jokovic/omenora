import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_BASE_URL } from '../constants/config';
import { supabase } from '../lib/supabase';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor
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

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    // Handle specific error cases
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.status, error.response.data);
      
      // Handle rate limiting — pass through as raw AxiosError so callers can read response body
      if (error.response.status === 429) {
        return Promise.reject(error);
      }
      
      // Handle authentication errors
      if (error.response.status === 401) {
        // Handle token refresh or logout
        return Promise.reject(new Error('Authentication required'));
      }
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.request);
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
