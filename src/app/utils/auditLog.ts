import { supabase } from '@/lib/supabase';

export async function logAction(action: string, details: any): Promise<void> {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      action,
      details,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('[audit] failed to log action:', error);
  }
}
