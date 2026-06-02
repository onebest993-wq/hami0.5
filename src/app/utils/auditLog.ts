import { supabase } from '@/lib/supabase';
import { debug } from '@/app/utils/debug';
import { isSupabaseMissingRelationError } from '@/app/utils/supabaseErrors';

export async function logAction(action: string, details: any): Promise<void> {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      action,
      details,
    });

    if (error) {
      if (isSupabaseMissingRelationError(error)) return;
      throw error;
    }
  } catch (error) {
    if (isSupabaseMissingRelationError(error)) return;
    debug.error('[audit] failed to log action:', error);
  }
}
