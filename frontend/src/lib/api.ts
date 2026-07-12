import { supabase } from '../supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface RequestOptions extends RequestInit {
  body?: any;
}

async function request(method: string, path: string, options: RequestOptions = {}) {
  // Get active session token if exists
  let token: string | null = null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token || null;
  } catch (err) {
    console.error('Error getting Supabase session:', err);
  }

  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const config: RequestInit = {
    ...options,
    method,
    headers,
  };

  if (options.body) {
    config.body = options.body instanceof FormData ? options.body : JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, config);

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData && errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Fallback if parsing fails
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses or 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  get: (path: string, options?: RequestOptions) => request('GET', path, options),
  post: (path: string, body?: any, options?: RequestOptions) => request('POST', path, { ...options, body }),
  patch: (path: string, body?: any, options?: RequestOptions) => request('PATCH', path, { ...options, body }),
  put: (path: string, body?: any, options?: RequestOptions) => request('PUT', path, { ...options, body }),
  delete: (path: string, options?: RequestOptions) => request('DELETE', path, options),
};
