import { createClient } from '@supabase/supabase-js';

// Read from env variables or from localStorage for dynamic setup
const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  
  const localUrl = localStorage.getItem('supabase_url') || '';
  const localKey = localStorage.getItem('supabase_key') || '';
  
  return {
    url: envUrl || localUrl,
    key: envKey || localKey,
    isConfigured: !!(envUrl || localUrl) && !!(envKey || localKey)
  };
};

const config = getSupabaseConfig();

export const isSupabaseConfigured = () => {
  return getSupabaseConfig().isConfigured;
};

// Create client (empty string fallbacks to prevent errors if not initialized yet)
export const supabase = createClient(
  config.url || 'https://placeholder-project.supabase.co',
  config.key || 'placeholder-key'
);

export const updateSupabaseConfig = (url: string, key: string) => {
  localStorage.setItem('supabase_url', url);
  localStorage.setItem('supabase_key', key);
  window.location.reload();
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem('supabase_url');
  localStorage.removeItem('supabase_key');
  window.location.reload();
};
