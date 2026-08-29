import { isJsonObjectRecord, sanitizePayload } from '../../security/sanitizer.ts';
import { getGoTrueAdminApi, getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { requireTrustedHeadquartersAdmin } from '../../security/requireTrustedHeadquartersAdmin.ts';
import { isHeadquartersAdminRole } from '../../security/headquartersUserMap.ts';
import { fetchHeadquartersUser } from '../../security/headquartersUsers.ts';
import { resolveHeadquartersControlTarget, rejectHeadquartersTargetId } from '../../security/headquartersControlTarget.ts';
import { invalidateProfileRoleCache } from '../../security/roleResolver.ts';
import { invalidateWifeUserStatusCache } from '../../security/wifeUserStatus.ts';
import { consumeRateLimitSlot } from '../../security/wifeRateLimitStore.ts';
import { recordHeadquartersAudit } from '../../security/headquartersAudit.ts';
import {
    notifyHeadquartersAccountStatus,
    notifyHeadquartersCredentialStatus,
    notifyHeadquartersForumStatus,
} from '../../security/headquartersAccountNotify.ts';
import { validateHeadquartersAccountPassword } from '../../security/headquartersAccountPassword.ts';
import { loadHeadquartersAccountActivity } from '../../security/headquartersAccountActivity.ts';
import {
    applyGoTrueLoginBan,
    freezeProfileUpdates,
    isHqFreezeDurationHours,
    isHqProfileLoginLocked,
    liftGoTrueLoginBan,
    loginLockProfileUpdates,
    loginUnlockProfileUpdates,
    publicVerifiedBadgeProfileUpdates,
    restoreProfileUpdates,
    revokeHeadquartersUserAccess,
    softDeleteProfileUpdates,
    unfreezeProfileUpdates,
    updateHeadquartersProfile,
    type HqFreezeDurationHours,
} from '../../security/headquartersAccountControl.ts';
import {
    deleteHeadquartersForumBan,
    upsertHeadquartersForumBan,
} from '../../security/headquartersForumInboxQuery.ts';
import { composeLawyerDirectoryName } from '@/app/domain/admin/AdminUser';
import { stripHqControlChars } from '@/app/domain/admin/hqSafeText';

export const runtime = 'nodejs';

const ACTIONS = new Set([
    'freeze',
    'unfreeze',
    'revoke_sessions',
    'set_password',
    'lock_login',
    'unlock_login',
    'soft_delete',
    'restore',
    'forum_ban',
    'forum_unban',
    'public_badge',
]);

function invalidateSubjectCaches(userId: string): void {
    invalidateProfileRoleCache(userId);
    invalidateWifeUserStatusCache(userId);
}

function forumExpiryFromHours(hours: HqFreezeDurationHours): string | undefined {
    if (hours <= 0) return undefined;
    return new Date(Date.now() + hours * 3_600_000).toISOString();
}

export async function GET(request: Request): Promise<Response> {
    try {
        const gate = await requireTrustedHeadquartersAdmin(request);
        if (!gate.ok) return gate.response;

        const allowed = await consumeRateLimitSlot(`admin-hq-account-read:${gate.userId}`, {
            maxRequests: 40,
            windowMs: 60_000,
        });
        if (!allowed) {
            return wifeJsonResponse(429, { ok: false, error: 'تجاوزت حد عمليات المقر — حاول لاحقاً' });
        }

        const targetUserId = new URL(request.url).searchParams.get('targetUserId')?.trim() ?? '';
        const blocked = rejectHeadquartersTargetId(targetUserId, gate.userId, { allowSelf: true });
        if (blocked) {
            const error =
                blocked.status === 403
                    ? 'لا يمكن عرض سجل مدير المنصّة بهذا المسار'
                    : blocked.error;
            return wifeJsonResponse(blocked.status, { ok: false, error });
        }

        const admin = getSupabaseAdminClient();
        if (!admin) {
            return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
        }

        const existing = await fetchHeadquartersUser(admin, targetUserId);
        if (!existing) {
            return wifeJsonResponse(404, { ok: false, error: 'المستخدم غير موجود' });
        }
        if (isHeadquartersAdminRole(existing.role)) {
            return wifeJsonResponse(403, { ok: false, error: 'لا يمكن عرض سجل حساب إدارة بهذا المسار' });
        }

        const activity = await loadHeadquartersAccountActivity(admin, targetUserId, existing.createdAt);
        return wifeJsonResponse(200, { ok: true, user: existing, activity });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'Internal admin account error' });
    }
}

export async function POST(request: Request): Promise<Response> {
    try {
        const gate = await requireTrustedHeadquartersAdmin(request, { stepUp: true });
        if (!gate.ok) return gate.response;
        const { userId } = gate;

        const allowed = await consumeRateLimitSlot(`admin-hq-account:${userId}`, {
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

        const action = String(payload.action ?? '').trim();
        if (!ACTIONS.has(action)) {
            return wifeJsonResponse(400, { ok: false, error: 'إجراء غير معروف' });
        }

        const targetUserId = typeof payload.targetUserId === 'string' ? payload.targetUserId.trim() : '';
        const blocked = rejectHeadquartersTargetId(targetUserId, userId);
        if (blocked) {
            return wifeJsonResponse(blocked.status, { ok: false, error: blocked.error });
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

        const respondUser = async (action: string, details?: Record<string, unknown>) => {
            const [user, auditRecorded] = await Promise.all([
                fetchHeadquartersUser(admin, targetUserId),
                recordHeadquartersAudit({
                    actorId: userId,
                    action,
                    targetId: targetUserId,
                    details,
                }),
            ]);
            return wifeJsonResponse(200, { ok: true, auditRecorded, ...(user ? { user } : {}) });
        };

        if (action === 'set_password') {
            const passwordError = validateHeadquartersAccountPassword(payload.password);
            if (passwordError) {
                return wifeJsonResponse(400, { ok: false, error: passwordError });
            }
            const password = String(payload.password);
            const { error } = await getGoTrueAdminApi(admin).updateUserById(targetUserId, { password });
            if (error) {
                return wifeJsonResponse(500, { ok: false, error: 'تعذّر تحديث كلمة المرور' });
            }
            await revokeHeadquartersUserAccess(targetUserId);
            invalidateSubjectCaches(targetUserId);
            void notifyHeadquartersCredentialStatus({
                userId: targetUserId,
                kind: 'password_reset',
            });
            return respondUser('user.set_password');
        }

        if (action === 'revoke_sessions') {
            await revokeHeadquartersUserAccess(targetUserId);
            invalidateSubjectCaches(targetUserId);
            void notifyHeadquartersCredentialStatus({
                userId: targetUserId,
                kind: 'sessions_revoked',
            });
            return respondUser('user.revoke_sessions');
        }

        if (action === 'unfreeze') {
            const { error } = await updateHeadquartersProfile(admin, targetUserId, unfreezeProfileUpdates());
            if (error) {
                return wifeJsonResponse(500, { ok: false, error: 'تعذّر إلغاء التجميد' });
            }
            if (!isHqProfileLoginLocked(existing)) {
                await liftGoTrueLoginBan(targetUserId);
            }
            invalidateSubjectCaches(targetUserId);
            void notifyHeadquartersAccountStatus({
                userId: targetUserId,
                kind: 'unfrozen',
            });
            return respondUser('user.unfreeze');
        }

        if (action === 'freeze') {
            const durationHours = payload.durationHours as HqFreezeDurationHours | unknown;
            if (!isHqFreezeDurationHours(durationHours)) {
                return wifeJsonResponse(400, { ok: false, error: 'مدة التجميد غير صالحة' });
            }
            const { error } = await updateHeadquartersProfile(
                admin,
                targetUserId,
                freezeProfileUpdates(durationHours),
            );
            if (error) {
                return wifeJsonResponse(500, { ok: false, error: 'تعذّر تجميد الحساب' });
            }
            if (!isHqProfileLoginLocked(existing)) {
                await liftGoTrueLoginBan(targetUserId);
            }
            invalidateSubjectCaches(targetUserId);
            const [user, auditRecorded] = await Promise.all([
                fetchHeadquartersUser(admin, targetUserId),
                recordHeadquartersAudit({
                    actorId: userId,
                    action: durationHours > 0 ? 'user.freeze_timed' : 'user.freeze',
                    targetId: targetUserId,
                    details: { durationHours },
                }),
            ]);
            void notifyHeadquartersAccountStatus({
                userId: targetUserId,
                kind: 'frozen',
                durationHours,
                freezeUntil: user?.freezeUntil ?? (durationHours > 0
                    ? new Date(Date.now() + durationHours * 3_600_000).toISOString()
                    : null),
            });
            return wifeJsonResponse(200, { ok: true, auditRecorded, ...(user ? { user } : {}) });
        }

        if (action === 'lock_login') {
            const durationHours = payload.durationHours as HqFreezeDurationHours | unknown;
            if (!isHqFreezeDurationHours(durationHours)) {
                return wifeJsonResponse(400, { ok: false, error: 'مدة قفل الدخول غير صالحة' });
            }
            if (existing.isDeleted) {
                return wifeJsonResponse(400, { ok: false, error: 'الحساب محذوف — استعده أولاً' });
            }
            const { error } = await updateHeadquartersProfile(
                admin,
                targetUserId,
                loginLockProfileUpdates(durationHours),
            );
            if (error) {
                return wifeJsonResponse(500, { ok: false, error: 'تعذّر قفل الدخول' });
            }
            await applyGoTrueLoginBan(targetUserId, durationHours);
            await revokeHeadquartersUserAccess(targetUserId);
            invalidateSubjectCaches(targetUserId);
            const [user, auditRecorded] = await Promise.all([
                fetchHeadquartersUser(admin, targetUserId),
                recordHeadquartersAudit({
                    actorId: userId,
                    action: durationHours > 0 ? 'user.lock_login_timed' : 'user.lock_login',
                    targetId: targetUserId,
                    details: { durationHours },
                }),
            ]);
            void notifyHeadquartersAccountStatus({
                userId: targetUserId,
                kind: 'login_locked',
                durationHours,
                loginUntil: user?.loginUntil ?? (durationHours > 0
                    ? new Date(Date.now() + durationHours * 3_600_000).toISOString()
                    : null),
            });
            return wifeJsonResponse(200, { ok: true, auditRecorded, ...(user ? { user } : {}) });
        }

        if (action === 'unlock_login') {
            if (existing.isDeleted) {
                return wifeJsonResponse(400, { ok: false, error: 'الحساب محذوف — استعده أولاً' });
            }
            const { error } = await updateHeadquartersProfile(admin, targetUserId, loginUnlockProfileUpdates());
            if (error) {
                return wifeJsonResponse(500, { ok: false, error: 'تعذّر فتح الدخول' });
            }
            await liftGoTrueLoginBan(targetUserId);
            invalidateSubjectCaches(targetUserId);
            void notifyHeadquartersAccountStatus({
                userId: targetUserId,
                kind: 'login_unlocked',
            });
            return respondUser('user.unlock_login');
        }

        if (action === 'soft_delete') {
            if (existing.isDeleted) {
                return wifeJsonResponse(400, { ok: false, error: 'الحساب محذوف مسبقاً' });
            }
            const { error } = await updateHeadquartersProfile(admin, targetUserId, softDeleteProfileUpdates());
            if (error) {
                return wifeJsonResponse(500, { ok: false, error: 'تعذّر حذف الحساب' });
            }
            await applyGoTrueLoginBan(targetUserId, 0);
            await revokeHeadquartersUserAccess(targetUserId);
            invalidateSubjectCaches(targetUserId);
            void notifyHeadquartersAccountStatus({
                userId: targetUserId,
                kind: 'deleted',
            });
            return respondUser('user.soft_delete');
        }

        if (action === 'restore') {
            if (!existing.isDeleted) {
                return wifeJsonResponse(400, { ok: false, error: 'الحساب غير محذوف' });
            }
            const { error } = await updateHeadquartersProfile(admin, targetUserId, restoreProfileUpdates());
            if (error) {
                return wifeJsonResponse(500, { ok: false, error: 'تعذّرت استعادة الحساب' });
            }
            await liftGoTrueLoginBan(targetUserId);
            invalidateSubjectCaches(targetUserId);
            void notifyHeadquartersAccountStatus({
                userId: targetUserId,
                kind: 'restored',
            });
            return respondUser('user.restore');
        }

        if (action === 'forum_ban') {
            const reason = stripHqControlChars(payload.reason, 240);
            if (reason.length < 3) {
                return wifeJsonResponse(400, { ok: false, error: 'سبب حظر المنتدى مطلوب' });
            }
            const durationHours = payload.durationHours as HqFreezeDurationHours | unknown;
            const expiresAt = isHqFreezeDurationHours(durationHours)
                ? forumExpiryFromHours(durationHours)
                : undefined;
            await upsertHeadquartersForumBan(admin, {
                userId: targetUserId,
                userName: composeLawyerDirectoryName(existing.fullName, existing.familyName, existing.email),
                reason,
                bannedBy: userId,
                bannedAt: new Date().toISOString(),
                expiresAt,
            });
            void notifyHeadquartersForumStatus({
                userId: targetUserId,
                kind: 'banned',
                reason,
            });
            return respondUser('forum.ban');
        }

        if (action === 'forum_unban') {
            await deleteHeadquartersForumBan(admin, targetUserId);
            void notifyHeadquartersForumStatus({
                userId: targetUserId,
                kind: 'unbanned',
            });
            return respondUser('forum.unban');
        }

        if (action === 'public_badge') {
            if (existing.isDeleted) {
                return wifeJsonResponse(400, { ok: false, error: 'الحساب محذوف — استعده أولاً' });
            }
            if (existing.role !== 'lawyer') {
                return wifeJsonResponse(400, { ok: false, error: 'علامة التوثيق العامة للمحامين فقط' });
            }
            if (payload.shown !== true && payload.shown !== false) {
                return wifeJsonResponse(400, { ok: false, error: 'قيمة علامة التوثيق غير صالحة' });
            }
            const shown = payload.shown === true;
            const { error } = await updateHeadquartersProfile(
                admin,
                targetUserId,
                publicVerifiedBadgeProfileUpdates(shown),
            );
            if (error) {
                return wifeJsonResponse(500, { ok: false, error: 'تعذّر تحديث علامة التوثيق' });
            }
            return respondUser('user.public_badge', { shown });
        }

        return wifeJsonResponse(400, { ok: false, error: 'إجراء غير معروف' });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'Internal admin account error' });
    }
}
