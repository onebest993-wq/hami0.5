import { isJsonObjectRecord, sanitizePayload } from '../../security/sanitizer.ts';
import { requireTrustedHeadquartersAdmin } from '../../security/requireTrustedHeadquartersAdmin.ts';
import { getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { consumeRateLimitSlot } from '../../security/wifeRateLimitStore.ts';
import { recordHeadquartersAudit } from '../../security/headquartersAudit.ts';
import { isPostgresUuidSubject } from '../../security/postgresUuidSubject.ts';
import {
    deleteHeadquartersConsultation,
    listHeadquartersConsultations,
    setHeadquartersPostFlags,
} from '../../security/headquartersConsultationsQuery.ts';
import { HEADQUARTERS_CONSULTATIONS_CAP } from '../../security/headquartersConsultationsMap.ts';
import { notifyHeadquartersModeration } from '../../security/headquartersAccountNotify.ts';

export const runtime = 'nodejs';

const CONSULTATION_ACTIONS = new Set(['delete', 'pin', 'unpin', 'lock', 'unlock']);

export async function GET(request: Request): Promise<Response> {
    try {
        const gate = await requireTrustedHeadquartersAdmin(request);
        if (!gate.ok) return gate.response;

        const allowed = await consumeRateLimitSlot(`admin-hq-consultations:${gate.userId}`, {
            maxRequests: 40,
            windowMs: 60_000,
        });
        if (!allowed) {
            return wifeJsonResponse(429, { ok: false, error: 'تجاوزت حد عمليات المقر — حاول لاحقاً' });
        }

        const admin = getSupabaseAdminClient();
        if (!admin) {
            return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
        }

        const consultations = await listHeadquartersConsultations(admin);
        return wifeJsonResponse(200, {
            ok: true,
            consultations,
            capped: consultations.length >= HEADQUARTERS_CONSULTATIONS_CAP,
        });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'Internal admin consultations error' });
    }
}

export async function POST(request: Request): Promise<Response> {
    try {
        const gate = await requireTrustedHeadquartersAdmin(request);
        if (!gate.ok) return gate.response;

        const allowed = await consumeRateLimitSlot(`admin-hq-consultations-del:${gate.userId}`, {
            maxRequests: 20,
            windowMs: 15 * 60_000,
        });
        if (!allowed) {
            return wifeJsonResponse(429, { ok: false, error: 'تجاوزت حد عمليات المقر — حاول لاحقاً' });
        }

        let payload: unknown = null;
        try {
            payload = sanitizePayload(await request.json());
        } catch {
            payload = null;
        }
        if (!isJsonObjectRecord(payload)) {
            return wifeJsonResponse(400, { ok: false, error: 'Invalid payload' });
        }

        const postId = String(payload.postId ?? '').trim();
        if (!isPostgresUuidSubject(postId)) {
            return wifeJsonResponse(400, { ok: false, error: 'postId مطلوب' });
        }

        const action =
            typeof payload.action === 'string' && payload.action.trim()
                ? payload.action.trim()
                : 'delete';
        if (!CONSULTATION_ACTIONS.has(action)) {
            return wifeJsonResponse(400, { ok: false, error: 'إجراء غير معروف' });
        }

        const admin = getSupabaseAdminClient();
        if (!admin) {
            return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
        }

        if (action === 'pin' || action === 'unpin' || action === 'lock' || action === 'unlock') {
            const result = await setHeadquartersPostFlags(admin, postId, {
                pinned: action === 'pin' ? true : action === 'unpin' ? false : undefined,
                locked: action === 'lock' ? true : action === 'unlock' ? false : undefined,
            });
            if (result === 'missing') {
                return wifeJsonResponse(404, { ok: false, error: 'المنشور غير موجود' });
            }
            if ((action === 'lock' || action === 'unlock') && result.authorId) {
                void notifyHeadquartersModeration({
                    userId: result.authorId,
                    kind: action === 'lock' ? 'post_locked' : 'post_unlocked',
                    entityId: postId,
                });
            }
            const auditRecorded = await recordHeadquartersAudit({
                actorId: gate.userId,
                action: `consultation.${action}`,
                targetId: postId,
            });
            return wifeJsonResponse(200, { ok: true, postId, action, auditRecorded });
        }

        const result = await deleteHeadquartersConsultation(admin, postId);
        if (result === 'missing') {
            return wifeJsonResponse(404, { ok: false, error: 'المنشور غير موجود' });
        }
        if (result.authorId) {
            void notifyHeadquartersModeration({
                userId: result.authorId,
                kind: 'post_removed',
                entityId: postId,
            });
        }
        const auditRecorded = await recordHeadquartersAudit({
            actorId: gate.userId,
            action: 'consultation.delete',
            targetId: postId,
        });
        return wifeJsonResponse(200, { ok: true, postId, auditRecorded });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'Internal admin consultations error' });
    }
}
