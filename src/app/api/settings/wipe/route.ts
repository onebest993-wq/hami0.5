import { requireWifeUser, unwrapWifeUser } from '@/app/api/security/bffAuth';
import { getSupabaseAdminClient } from '@/app/api/security/supabaseAdminClient';
import { wifeJsonResponse } from '@/app/api/security/wifeSecurityHeaders';
import { wipeAuthenticatedUserCloud } from './wipeAuthenticatedUserCloud';

export const runtime = 'nodejs';

export const SETTINGS_WIPE_CONFIRMATION = 'WIPE_ALL_APPLICATION_DATA_V1';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

/**
 * Deletes cloud application data for the authenticated BFF subject.
 * The database portion is one PostgreSQL transaction; object storage is
 * idempotent and reported separately because it cannot share that transaction.
 */
export async function POST(request: Request): Promise<Response> {
    try {
        const authGate = unwrapWifeUser(await requireWifeUser(request));
        if ('response' in authGate) return authGate.response;
        const { userId } = authGate;

        const payload = (await request.json().catch(() => null)) as unknown;
        if (
            !isRecord(payload) ||
            payload.confirmation !== SETTINGS_WIPE_CONFIRMATION ||
            payload.version !== 1
        ) {
            return wifeJsonResponse(400, {
                ok: false,
                error: 'Invalid wipe confirmation',
                code: 'WIPE_CONFIRMATION_REQUIRED',
            });
        }

        const admin = getSupabaseAdminClient();
        if (!admin) {
            return wifeJsonResponse(503, {
                ok: false,
                error: 'Database client not configured',
                code: 'WIPE_BACKEND_UNAVAILABLE',
            });
        }

        const wiped = await wipeAuthenticatedUserCloud(admin, userId);
        if (!wiped.ok) {
            if (wiped.code === 'WIPE_STORAGE_PARTIAL') {
                return wifeJsonResponse(500, {
                    ok: false,
                    complete: false,
                    partial: true,
                    error: 'Cloud database was wiped but object storage cleanup failed',
                    code: 'WIPE_STORAGE_PARTIAL',
                    receipt: { database: wiped.database },
                });
            }
            return wifeJsonResponse(500, {
                ok: false,
                error: 'Cloud database wipe failed',
                code: 'WIPE_DATABASE_FAILED',
            });
        }

        return wifeJsonResponse(200, {
            ok: true,
            complete: true,
            receipt: wiped.bundle,
        });
    } catch {
        return wifeJsonResponse(500, {
            ok: false,
            complete: false,
            error: 'Internal settings wipe error',
            code: 'WIPE_INTERNAL_ERROR',
        });
    }
}
