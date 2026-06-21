import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '@/utils/supabase/info';

const supabaseUrl =
  (typeof import.meta.env.VITE_SUPABASE_URL === 'string' && import.meta.env.VITE_SUPABASE_URL.trim()) ||
  `https://${projectId}.supabase.co`;

const supabaseKey =
  (typeof import.meta.env.VITE_SUPABASE_ANON_KEY === 'string' && import.meta.env.VITE_SUPABASE_ANON_KEY.trim()) ||
  publicAnonKey;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: import.meta.env.VITE_BFF_AUTH !== 'true',
    autoRefreshToken: import.meta.env.VITE_BFF_AUTH !== 'true',
    detectSessionInUrl: true,
  },
});
