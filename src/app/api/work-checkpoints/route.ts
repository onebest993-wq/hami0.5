import { requireWifeCloudWrite, requireWifeUser, unwrapWifeUser } from '@/app/api/security/bffAuth';
import { getSupabaseAdminClient } from '@/app/api/security/supabaseAdminClient';
import { wifeJsonResponse } from '@/app/api/security/wifeSecurityHeaders';
import { isPostgresUuidSubject, rejectNonUuidCloudWrite } from '@/app/api/security/postgresUuidSubject';
import { isJsonObjectRecord } from '@/app/api/security/sanitizer';

export const runtime = 'nodejs';

const TABLE = 'lawyer_work_checkpoints';
const KEEP_LATEST = 3;
const MAX_CIPHER_CHARS = 1_800_000;

function isNonEmptyString(value: unknown, max: number): value is string {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

export async function GET(request: Request): Promise<Response> {
    try {
        const authGate = unwrapWifeUser(await requireWifeUser(request));
        if ('response' in authGate) return authGate.response;
        const { userId } = authGate;
        if (!isPostgresUuidSubject(userId)) {
            return wifeJsonResponse(200, { ok: true, checkpoint: null });
        }

        const admin = getSupabaseAdminClient();
        if (!admin) {
            return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
        }

        const { data, error } = await admin
            .from(TABLE)
            .select('encrypted_data, data_signature, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            return wifeJsonResponse(500, { ok: false, error: 'Failed to load work checkpoint' });
        }
        if (!data) {
            return wifeJsonResponse(200, { ok: true, checkpoint: null });
        }
        return wifeJsonResponse(200, {
            ok: true,
            checkpoint: {
                encrypted_data: data.encrypted_data,
                data_signature: data.data_signature,
                created_at: data.created_at,
            },
        });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'Internal work checkpoint error' });
    }
}

export async function POST(request: Request): Promise<Response> {
    try {
        const authGate = unwrapWifeUser(await requireWifeCloudWrite(request));
        if ('response' in authGate) return authGate.response;
        const { userId } = authGate;
        const denied = rejectNonUuidCloudWrite(userId);
        if (denied) return denied;

        let payload: unknown = null;
        try {
            payload = await request.json();
        } catch {
            payload = null;
        }
        if (!isJsonObjectRecord(payload)) {
            return wifeJsonResponse(400, { ok: false, error: 'Invalid payload' });
        }
        if (!isNonEmptyString(payload.encrypted_data, MAX_CIPHER_CHARS)) {
            return wifeJsonResponse(400, { ok: false, error: 'encrypted_data مطلوب' });
        }
        if (!isNonEmptyString(payload.data_signature, 512)) {
            return wifeJsonResponse(400, { ok: false, error: 'data_signature مطلوب' });
        }

        const admin = getSupabaseAdminClient();
        if (!admin) {
            return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
        }

        const { error: insertError } = await admin.from(TABLE).insert({
            user_id: userId,
            encrypted_data: payload.encrypted_data,
            data_signature: payload.data_signature,
            security_version: 3,
        });
        if (insertError) {
            return wifeJsonResponse(500, { ok: false, error: 'Failed to save work checkpoint' });
        }

        const { data: rows } = await admin
            .from(TABLE)
            .select('id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        const dropIds = (rows ?? [])
            .map((row: { id?: unknown }) => row.id)
            .filter((id: unknown): id is string => typeof id === 'string')
            .slice(KEEP_LATEST);
        if (dropIds.length > 0) {
            await admin.from(TABLE).delete().in('id', dropIds);
        }

        return wifeJsonResponse(200, { ok: true });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'Internal work checkpoint error' });
    }
}
