import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '@/utils/supabase/info';

const supabaseUrl =
  (typeof import.meta.env.VITE_SUPABASE_URL === 'string' && import.meta.env.VITE_SUPABASE_URL.trim()) ||
  `https://${projectId}.supabase.co`;

const supabaseKey =
  (typeof import.meta.env.VITE_SUPABASE_ANON_KEY === 'string' && import.meta.env.VITE_SUPABASE_ANON_KEY.trim()) ||
  publicAnonKey;

const isTestMode = import.meta.env.MODE === 'test';
const isBffAuth = import.meta.env.VITE_BFF_AUTH === 'true';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Avoid browser-session side effects in Vitest/jsdom where many isolated modules
    // may create the client and trigger noisy GoTrue multi-instance warnings.
    persistSession: !isBffAuth && !isTestMode,
    autoRefreshToken: !isBffAuth && !isTestMode,
    detectSessionInUrl: !isTestMode,
  },
});
