import { requireWifeCloudWrite, requireWifeUser, unwrapWifeUser } from '@/app/api/security/bffAuth';
import { getSupabaseAdminClient } from '@/app/api/security/supabaseAdminClient';
import { wifeJsonResponse } from '@/app/api/security/wifeSecurityHeaders';
import { isPostgresUuidSubject, rejectNonUuidCloudWrite } from '@/app/api/security/postgresUuidSubject';
import { isJsonObjectRecord } from '@/app/api/security/sanitizer';
import {
    idsToDropWorkCheckpoints,
    mergeWorkCheckpointReads,
    toPublicWorkCheckpoint,
    WORK_CHECKPOINT_KEEP_LATEST,
    type WorkCheckpointReadRow,
} from '@/app/api/work-checkpoints/workCheckpointRetention';

export const runtime = 'nodejs';

const TABLE = 'lawyer_work_checkpoints';
const KEEP_LATEST = WORK_CHECKPOINT_KEEP_LATEST;
const MAX_CIPHER_CHARS = 1_800_000;
const SELECT_BLOB = 'id, encrypted_data, data_signature, created_at, keep_anchor';

function isNonEmptyString(value: unknown, max: number): value is string {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

function asReadRows(data: unknown): WorkCheckpointReadRow[] {
    if (!Array.isArray(data)) return [];
    return data.filter((row): row is WorkCheckpointReadRow => {
        if (!row || typeof row !== 'object') return false;
        const id = (row as { id?: unknown }).id;
        return typeof id === 'string' && id.length > 0;
    });
}

export async function GET(request: Request): Promise<Response> {
    try {
        const authGate = unwrapWifeUser(await requireWifeUser(request));
        if ('response' in authGate) return authGate.response;
        const { userId } = authGate;
        if (!isPostgresUuidSubject(userId)) {
            return wifeJsonResponse(200, { ok: true, checkpoint: null, checkpoints: [] });
        }

        const admin = getSupabaseAdminClient();
        if (!admin) {
            return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
        }

        const latestQuery = await admin
            .from(TABLE)
            .select(SELECT_BLOB)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(KEEP_LATEST);

        if (latestQuery.error) {
            return wifeJsonResponse(500, { ok: false, error: 'Failed to load work checkpoint' });
        }

        const anchorQuery = await admin
            .from(TABLE)
            .select(SELECT_BLOB)
            .eq('user_id', userId)
            .eq('keep_anchor', true)
            .order('created_at', { ascending: false })
            .limit(1);

        const latest = asReadRows(latestQuery.data);
        const anchor = asReadRows(anchorQuery.error ? [] : anchorQuery.data)[0] ?? null;
        const merged = mergeWorkCheckpointReads(latest, anchor);
        const checkpoints = merged.map(toPublicWorkCheckpoint);
        return wifeJsonResponse(200, {
            ok: true,
            checkpoint: checkpoints[0] ?? null,
            checkpoints,
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
            keep_anchor: payload.keep_anchor === true,
        });
        if (insertError) {
            return wifeJsonResponse(500, { ok: false, error: 'Failed to save work checkpoint' });
        }

        const { data: rows } = await admin
            .from(TABLE)
            .select('id, keep_anchor')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        const dropIds = idsToDropWorkCheckpoints(
            (rows ?? []).filter((row: unknown): row is { id: string; keep_anchor?: boolean } => {
                if (!row || typeof row !== 'object') return false;
                const id = (row as { id?: unknown }).id;
                return typeof id === 'string' && id.length > 0;
            }),
        );
        if (dropIds.length > 0) {
            await admin.from(TABLE).delete().in('id', dropIds);
        }

        return wifeJsonResponse(200, { ok: true });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'Internal work checkpoint error' });
    }
}
