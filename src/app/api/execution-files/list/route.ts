import { getSupabaseAdminClient } from '@/app/api/security/supabaseAdminClient';
import { wifeJsonResponse } from '@/app/api/security/wifeSecurityHeaders';
import { emptyUuidScopedRows } from '@/app/api/security/postgresUuidSubject';
import { requireExecutionFilesAuth } from '../_auth';
import { retainCloudRowIfPayloadMacOk } from '@/app/api/security/encryptedPayloadSignature';

export const runtime = 'nodejs';

const TABLE = 'execution_files';

export async function GET(request: Request): Promise<Response> {
  try {
    const authGate = await requireExecutionFilesAuth(request);
    if (authGate.ok === false) return authGate.response;
    const { userId } = authGate;
    const empty = emptyUuidScopedRows(userId);
    if (empty) return empty;

    const admin = getSupabaseAdminClient();
    if (!admin) {
      return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
    }

    const { data, error } = await admin
      .from(TABLE)
      .select(
        'id,external_id,user_id,case_no,execution_type,court,execution_basis,encrypted_data,data_signature,payload_mac,security_version,status,created_at,updated_at',
      )
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      return wifeJsonResponse(500, { ok: false, error: 'Failed to load execution files' });
    }

    const rows = ((data ?? []) as Array<{ encrypted_data?: string; payload_mac?: string | null }>).filter(
      retainCloudRowIfPayloadMacOk,
    );
    return wifeJsonResponse(200, { ok: true, rows });
  } catch {
    return wifeJsonResponse(500, { ok: false, error: 'Internal execution list error' });
  }
}

