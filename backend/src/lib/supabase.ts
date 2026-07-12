import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

// Define global WebSocket for Node.js < v22 compatibility
if (!globalThis.WebSocket) {
  globalThis.WebSocket = ws as any;
}

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('[supabase]: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in environment variables');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});


