import { requireWifeUser, unwrapWifeUser } from '@/app/api/security/bffAuth';
import { getGoTrueAdminApi, getSupabaseAdminClient } from '@/app/api/security/supabaseAdminClient';
import { wifeJsonResponse } from '@/app/api/security/wifeSecurityHeaders';
import { isAdminUserId } from '@/app/api/security/adminCheck';
import { invalidateCsrfForSubject } from '@/app/api/security/csrfServerStore.ts';
import { invalidateWifeSessionsForSubject } from '@/app/api/security/wifeSessionServerStore.ts';
import { revokeTokenSessionsForSubject } from '@/app/api/security/stolenTokenServer.ts';
import { wipeAuthenticatedUserCloud } from '@/app/api/settings/wipe/wipeAuthenticatedUserCloud';

export const runtime = 'nodejs';

export const ACCOUNT_DELETE_CONFIRMATION = 'DELETE_LAWYER_ACCOUNT_V1';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

function isAlreadyDeletedAuthError(error: { message?: string; status?: number } | null): boolean {
    if (!error) return false;
    if (error.status === 404) return true;
    return /user not found|not found/i.test(error.message ?? '');
}

/**
 * يمسح بيانات الحساب السحابية ثم يحذف هوية المصادقة.
 * لا يُعلن اكتمالاً إن بقي المستخدم قادراً على الدخول.
 */
export async function POST(request: Request): Promise<Response> {
    try {
        const authGate = unwrapWifeUser(await requireWifeUser(request));
        if ('response' in authGate) return authGate.response;
        const { userId } = authGate;

        const payload = (await request.json().catch(() => null)) as unknown;
        if (
            !isRecord(payload) ||
            payload.confirmation !== ACCOUNT_DELETE_CONFIRMATION ||
            payload.version !== 1
        ) {
            return wifeJsonResponse(400, {
                ok: false,
                error: 'Invalid account-delete confirmation',
                code: 'ACCOUNT_DELETE_CONFIRMATION_REQUIRED',
            });
        }

        if (await isAdminUserId(userId)) {
            return wifeJsonResponse(403, {
                ok: false,
                error: 'Platform admin account cannot be self-deleted',
                code: 'ACCOUNT_DELETE_FORBIDDEN',
            });
        }

        const admin = getSupabaseAdminClient();
        if (!admin) {
            return wifeJsonResponse(503, {
                ok: false,
                error: 'Database client not configured',
                code: 'ACCOUNT_DELETE_BACKEND_UNAVAILABLE',
            });
        }

        const wiped = await wipeAuthenticatedUserCloud(admin, userId);
        if (!wiped.ok) {
            if (wiped.code === 'WIPE_STORAGE_PARTIAL') {
                return wifeJsonResponse(500, {
                    ok: false,
                    complete: false,
                    partial: true,
                    authDeleted: false,
                    error: 'Cloud database was wiped but object storage cleanup failed',
                    code: 'ACCOUNT_DELETE_STORAGE_PARTIAL',
                    receipt: { database: wiped.database },
                });
            }
            return wifeJsonResponse(500, {
                ok: false,
                complete: false,
                authDeleted: false,
                error: 'Cloud database wipe failed',
                code: 'ACCOUNT_DELETE_DATABASE_FAILED',
            });
        }

        const { error: authError } = await getGoTrueAdminApi(admin).deleteUser(userId);
        if (authError && !isAlreadyDeletedAuthError(authError)) {
            return wifeJsonResponse(500, {
                ok: false,
                complete: false,
                partial: true,
                authDeleted: false,
                error: 'Cloud data was wiped but auth user deletion failed',
                code: 'ACCOUNT_DELETE_AUTH_FAILED',
                receipt: wiped.bundle,
            });
        }

        await Promise.allSettled([
            invalidateCsrfForSubject(userId),
            invalidateWifeSessionsForSubject(userId),
            revokeTokenSessionsForSubject(userId),
        ]);

        return wifeJsonResponse(200, {
            ok: true,
            complete: true,
            authDeleted: true,
            receipt: wiped.bundle,
        });
    } catch {
        return wifeJsonResponse(500, {
            ok: false,
            complete: false,
            authDeleted: false,
            error: 'Internal account delete error',
            code: 'ACCOUNT_DELETE_INTERNAL_ERROR',
        });
    }
}
