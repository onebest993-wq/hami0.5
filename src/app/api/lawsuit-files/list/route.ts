import { requireWifeUser, unwrapWifeUser } from '@/app/api/security/bffAuth';
import { getSupabaseAdminClient } from '@/app/api/security/supabaseAdminClient';
import { wifeJsonResponse } from '@/app/api/security/wifeSecurityHeaders';

export const runtime = 'nodejs';

const TABLE = 'lawsuit_files';

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
      .select(
        'id,external_id,user_id,case_no,court,stage,case_type,parent_id,encrypted_data,data_signature,security_version,status,created_at,updated_at',
      )
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      return wifeJsonResponse(500, { ok: false, error: 'Failed to load lawsuit files' });
    }

    return wifeJsonResponse(200, { ok: true, rows: data ?? [] });
  } catch {
    return wifeJsonResponse(500, { ok: false, error: 'Internal lawsuit list error' });
  }
}

