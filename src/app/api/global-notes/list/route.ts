import { requireWifeUser, unwrapWifeUser } from '@/app/api/security/bffAuth';
import { getSupabaseAdminClient } from '@/app/api/security/supabaseAdminClient';
import { wifeJsonResponse } from '@/app/api/security/wifeSecurityHeaders';

export const runtime = 'nodejs';

const TABLE = 'global_notes';

export async function GET(request: Request): Promise<Response> {
  try {
    const authGate = unwrapWifeUser(await requireWifeUser(request));
    if ('response' in authGate) return authGate.response;
    const { userId } = authGate;

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
    }

    const { data, error } = await admin
      .from(TABLE)
      .select('id,external_id,user_id,title,content,category,tags,created_at,updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      return wifeJsonResponse(500, { ok: false, error: 'Failed to load global notes' });
    }

    return wifeJsonResponse(200, { ok: true, rows: data ?? [] });
  } catch {
    return wifeJsonResponse(500, { ok: false, error: 'Internal global notes list error' });
  }
}

