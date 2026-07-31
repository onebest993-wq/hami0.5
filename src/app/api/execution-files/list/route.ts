import { getSupabaseAdminClient } from '@/app/api/security/supabaseAdminClient';
import { wifeJsonResponse } from '@/app/api/security/wifeSecurityHeaders';
import { requireExecutionFilesAuth } from '../_auth';

export const runtime = 'nodejs';

const TABLE = 'execution_files';

export async function GET(request: Request): Promise<Response> {
  try {
    const authGate = await requireExecutionFilesAuth(request);
    if (authGate.ok === false) return authGate.response;
    const { userId } = authGate;

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
    }

    const { data, error } = await admin
      .from(TABLE)
      .select(
        'id,external_id,user_id,case_no,execution_type,court,execution_basis,encrypted_data,data_signature,security_version,status,created_at,updated_at',
      )
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      return wifeJsonResponse(500, { ok: false, error: 'Failed to load execution files' });
    }

    return wifeJsonResponse(200, { ok: true, rows: data ?? [] });
  } catch {
    return wifeJsonResponse(500, { ok: false, error: 'Internal execution list error' });
  }
}

