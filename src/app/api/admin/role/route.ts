import { isJsonObjectRecord, sanitizePayload } from '../../security/sanitizer.ts';
import { getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { requireTrustedHeadquartersAdmin } from '../../security/requireTrustedHeadquartersAdmin.ts';
import { isHeadquartersAssignableRole } from '@/app/domain/admin/AdminUser';
import {
    rejectHeadquartersTargetId,
    resolveHeadquartersControlTarget,
} from '../../security/headquartersControlTarget.ts';
import { fetchHeadquartersUser } from '../../security/headquartersUsers.ts';
import { invalidateProfileRoleCache } from '../../security/roleResolver.ts';
import { invalidateCsrfForSubject } from '../../security/csrfServerStore.ts';
import { invalidateWifeSessionsForSubject } from '../../security/wifeSessionServerStore.ts';
import { revokeTokenSessionsForSubject } from '../../security/stolenTokenServer.ts';
import { consumeRateLimitSlot } from '../../security/wifeRateLimitStore.ts';
import { recordHeadquartersAudit } from '../../security/headquartersAudit.ts';
import { notifyHeadquartersRoleStatus } from '../../security/headquartersAccountNotify.ts';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
    try {
        const gate = await requireTrustedHeadquartersAdmin(request, { stepUp: true });
        if (!gate.ok) return gate.response;
        const { userId } = gate;

        const allowed = await consumeRateLimitSlot(`admin-hq-role:${userId}`, {
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

        const requesterId = typeof payload.requesterId === 'string' ? payload.requesterId.trim() : '';
        if (requesterId && requesterId !== userId) {
            return wifeJsonResponse(403, { ok: false, error: 'requesterId mismatch' });
        }

        const targetUserId = typeof payload.targetUserId === 'string' ? payload.targetUserId.trim() : '';
        const blocked = rejectHeadquartersTargetId(targetUserId, userId);
        if (blocked) {
            return wifeJsonResponse(blocked.status, { ok: false, error: blocked.error });
        }
        if (!isHeadquartersAssignableRole(payload.role)) {
            return wifeJsonResponse(400, { ok: false, error: 'دور غير مسموح' });
        }

        const admin = getSupabaseAdminClient();
        if (!admin) {
            return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
        }

        const target = await resolveHeadquartersControlTarget(admin, targetUserId, userId);
        if (!target.ok) {
            return wifeJsonResponse(target.status, { ok: false, error: target.error });
        }
        const existing = target.user;
        if (!existing) {
            return wifeJsonResponse(404, { ok: false, error: 'المستخدم غير موجود' });
        }

        const { error } = await admin
            .from('profiles')
            .update({ role: payload.role, updated_at: new Date().toISOString() })
            .eq('id', targetUserId);
        if (error) {
            return wifeJsonResponse(500, { ok: false, error: 'Role update failed' });
        }

        invalidateProfileRoleCache(targetUserId);
        await Promise.allSettled([
            invalidateCsrfForSubject(targetUserId),
            invalidateWifeSessionsForSubject(targetUserId),
            revokeTokenSessionsForSubject(targetUserId),
        ]);
        const auditRecorded = await recordHeadquartersAudit({
            actorId: userId,
            action: 'user.role',
            targetId: targetUserId,
            details: { role: payload.role },
        });
        void notifyHeadquartersRoleStatus({
            userId: targetUserId,
            role: payload.role,
        });

        const user = await fetchHeadquartersUser(admin, targetUserId);
        return wifeJsonResponse(200, { ok: true, auditRecorded, user: user ?? { ...existing, role: payload.role } });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'Internal admin role error' });
    }
}
