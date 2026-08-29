import { composeLawyerDirectoryName } from '@/app/domain/admin/AdminUser';
import { isJsonObjectRecord, sanitizePayload } from '../../security/sanitizer.ts';
import { getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import {
    deleteHeadquartersForumBan,
    HEADQUARTERS_FORUM_INBOX_CAP,
    listHeadquartersBannedUsers,
    upsertHeadquartersForumBan,
} from '../../security/headquartersForumInboxQuery.ts';
import {
    HQ_FORUM_BAN_NAME_MAX,
    HQ_FORUM_BAN_REASON_MAX,
    HQ_FORUM_BAN_REASON_MIN,
    resolveHqForumBanExpiry,
} from '../../security/headquartersForumBanExpiry.ts';
import { consumeRateLimitSlot } from '../../security/wifeRateLimitStore.ts';
import { recordHeadquartersAudit } from '../../security/headquartersAudit.ts';
import { isPostgresUuidSubject } from '../../security/postgresUuidSubject.ts';
import { jsonResponse } from '../_auth.ts';
import { requireTrustedHeadquartersAdmin } from '../../security/requireTrustedHeadquartersAdmin.ts';
import { notifyHeadquartersForumStatus } from '../../security/headquartersAccountNotify.ts';
import { resolveHeadquartersControlTarget, rejectHeadquartersTargetId } from '../../security/headquartersControlTarget.ts';

export async function GET(request: Request): Promise<Response> {
    try {
        const gate = await requireTrustedHeadquartersAdmin(request);
        if (!gate.ok) return gate.response;

        const allowed = await consumeRateLimitSlot(`admin-hq-forum-ban-get:${gate.userId}`, {
            maxRequests: 40,
            windowMs: 60_000,
        });
        if (!allowed) {
            return jsonResponse(429, { ok: false, error: 'تجاوزت حد عمليات المقر — حاول لاحقاً' });
        }

        const admin = getSupabaseAdminClient();
        if (!admin) {
            return jsonResponse(503, { ok: false, error: 'Database client not configured' });
        }

        const bannedUsers = await listHeadquartersBannedUsers(admin);
        return jsonResponse(200, {
            ok: true,
            bannedUsers,
            capped: bannedUsers.length >= HEADQUARTERS_FORUM_INBOX_CAP,
        });
    } catch {
        return jsonResponse(500, { ok: false, error: 'Internal server error' });
    }
}

export async function POST(request: Request): Promise<Response> {
    try {
        const gate = await requireTrustedHeadquartersAdmin(request);
        if (!gate.ok) return gate.response;
        const requesterId = gate.userId;

        const allowed = await consumeRateLimitSlot(`admin-hq-forum-ban:${requesterId}`, {
            maxRequests: 20,
            windowMs: 15 * 60_000,
        });
        if (!allowed) {
            return jsonResponse(429, { ok: false, error: 'تجاوزت حد عمليات المقر — حاول لاحقاً' });
        }

        let payload: unknown = null;
        try {
            payload = sanitizePayload(await request.json());
        } catch {
            payload = null;
        }
        if (!isJsonObjectRecord(payload) || typeof payload.action !== 'string') {
            return jsonResponse(400, { ok: false, error: 'action مطلوب' });
        }

        if (payload.action === 'ban') {
            const targetUserId = typeof payload.userId === 'string' ? payload.userId.trim() : '';
            if (!isPostgresUuidSubject(targetUserId)) {
                return jsonResponse(400, { ok: false, error: 'userId, userName, reason مطلوبة' });
            }
            const blocked = rejectHeadquartersTargetId(targetUserId, requesterId);
            if (blocked) {
                return jsonResponse(blocked.status, { ok: false, error: blocked.error });
            }
            const reason =
                typeof payload.reason === 'string' ? payload.reason.trim().slice(0, HQ_FORUM_BAN_REASON_MAX) : '';
            if (reason.length < HQ_FORUM_BAN_REASON_MIN) {
                return jsonResponse(400, { ok: false, error: 'userId, userName, reason مطلوبة' });
            }
            const expiresAt = resolveHqForumBanExpiry({
                durationHours: payload.durationHours,
                expiresAt: payload.expiresAt,
            });
            if (expiresAt === 'invalid') {
                return jsonResponse(400, { ok: false, error: 'expiresAt غير صالح' });
            }

            const admin = getSupabaseAdminClient();
            if (!admin) {
                return jsonResponse(503, { ok: false, error: 'Database client not configured' });
            }
            const target = await resolveHeadquartersControlTarget(admin, targetUserId, requesterId);
            if (!target.ok) {
                return jsonResponse(target.status, { ok: false, error: target.error });
            }
            const fromProfile = target.user
                ? composeLawyerDirectoryName(target.user.fullName, target.user.familyName, target.user.email)
                : '';
            const fromClient =
                typeof payload.userName === 'string' ? payload.userName.trim().slice(0, HQ_FORUM_BAN_NAME_MAX) : '';
            const userName =
                fromProfile && fromProfile !== '—'
                    ? fromProfile.slice(0, HQ_FORUM_BAN_NAME_MAX)
                    : fromClient;
            if (!userName) {
                return jsonResponse(400, { ok: false, error: 'userId, userName, reason مطلوبة' });
            }
            await upsertHeadquartersForumBan(admin, {
                userId: targetUserId,
                userName,
                reason,
                bannedBy: requesterId,
                bannedAt: new Date().toISOString(),
                expiresAt,
            });
            const auditRecorded = await recordHeadquartersAudit({
                actorId: requesterId,
                action: 'forum.ban',
                targetId: targetUserId,
            });
            void notifyHeadquartersForumStatus({
                userId: targetUserId,
                kind: 'banned',
                reason,
            });
            return jsonResponse(200, { ok: true, action: 'ban', userId: targetUserId, auditRecorded });
        }

        if (payload.action === 'unban') {
            const targetUserId = typeof payload.userId === 'string' ? payload.userId.trim() : '';
            if (!isPostgresUuidSubject(targetUserId)) {
                return jsonResponse(400, { ok: false, error: 'userId مطلوب' });
            }
            const blocked = rejectHeadquartersTargetId(targetUserId, requesterId);
            if (blocked) {
                return jsonResponse(blocked.status, { ok: false, error: blocked.error });
            }

            const admin = getSupabaseAdminClient();
            if (!admin) {
                return jsonResponse(503, { ok: false, error: 'Database client not configured' });
            }
            const target = await resolveHeadquartersControlTarget(admin, targetUserId, requesterId, {
                allowMissing: true,
            });
            if (!target.ok) {
                return jsonResponse(target.status, { ok: false, error: target.error });
            }
            const removed = await deleteHeadquartersForumBan(admin, targetUserId);
            if (removed === 'missing') {
                return jsonResponse(404, { ok: false, error: 'لا يوجد حظر ساري لهذا المستخدم' });
            }
            const auditRecorded = await recordHeadquartersAudit({
                actorId: requesterId,
                action: 'forum.unban',
                targetId: targetUserId,
            });
            void notifyHeadquartersForumStatus({
                userId: targetUserId,
                kind: 'unbanned',
            });
            return jsonResponse(200, { ok: true, action: 'unban', userId: targetUserId, auditRecorded });
        }

        return jsonResponse(400, { ok: false, error: 'إجراء غير معروف' });
    } catch {
        return jsonResponse(500, { ok: false, error: 'Internal server error' });
    }
}
