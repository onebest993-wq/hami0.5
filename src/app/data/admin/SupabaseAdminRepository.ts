import {
    isHeadquartersAssignableRole,
    type AdminUser,
    type AdminUserRole,
    type AdminUserStatus,
} from '@/app/domain/admin/AdminUser';
import {
    EMPTY_HQ_DIRECTORY_QUERY,
    HQ_DIRECTORY_PAGE_SIZE,
    hqDirectorySearchParams,
    type HqDirectoryListQuery,
} from '@/app/domain/admin/hqDirectoryQuery';
import { isHqAbortError, stripHqControlChars } from '@/app/domain/admin/hqSafeText';
import { parseAdminVerificationStatus } from '@/app/domain/admin/hqUserPresence';
import { IAdminRepository } from '@/app/domain/admin/IAdminRepository';
import { hqMutatingFetch } from '@/app/services/admin/hqSecureFetch';
import { HqStepUpCancelledError } from '@/app/components/admin/hqStepUpClient';
import { SecureFetchError } from '@/app/services/SecureFetchError';

type HqUserRow = {
    id?: unknown;
    email?: unknown;
    full_name?: unknown;
    fullName?: unknown;
    role?: unknown;
    status?: unknown;
    created_at?: unknown;
    createdAt?: unknown;
};

function toSafeMessage(error: unknown, fallback: string): string {
    if (!error || typeof error !== 'object') return fallback;
    const message = String((error as { message?: unknown }).message ?? '').trim();
    if (!message) return fallback;
    const lower = message.toLowerCase();
    if (
        lower.includes('unauthorized') ||
        lower.includes('42501') ||
        lower.includes('permission') ||
        lower.includes('jwt') ||
        lower.includes('trusted device')
    ) {
        return 'غير مصرّح — يلزم حساب إدارة منصّة وجهاز موثّق';
    }
    if (lower.includes('network') || lower.includes('fetch')) {
        return 'تعذّر الاتصال بخادم المقر';
    }
    if (message.length > 180) return fallback;
    return message;
}

function toSafeMessageFromFetch(error: SecureFetchError, fallback: string): string {
    try {
        const parsed = JSON.parse(error.bodyText) as { error?: unknown };
        if (typeof parsed.error === 'string' && parsed.error.trim()) {
            return toSafeMessage({ message: parsed.error }, fallback);
        }
    } catch {
        /* ignore */
    }
    if (error.status === 403) return 'غير مصرّح — يلزم حساب إدارة منصّة وجهاز موثّق';
    if (error.status === 401) return 'انتهت الجلسة — سجّل الدخول من جديد';
    if (error.status === 429) return 'تجاوزت حد عمليات المقر — حاول لاحقاً';
    return fallback;
}

function mapStatusFromRow(row: HqUserRow): AdminUserStatus {
    const statusRaw = String(row.status ?? '').trim().toLowerCase();
    if (statusRaw === 'active') return 'active';
    if (statusRaw === 'suspended' || statusRaw === 'banned' || statusRaw === 'frozen') {
        return 'suspended';
    }
    return 'active';
}

function mapRoleFromRow(row: HqUserRow): AdminUserRole {
    const role = String(row.role ?? '').trim().toLowerCase();
    if (role === 'lawyer' || role === 'admin' || role === 'moderator') {
        return role;
    }
    return 'lawyer';
}

function mapAdminUser(row: HqUserRow): AdminUser | null {
    const id = stripHqControlChars(row.id, 36);
    if (!id) return null;
    const email = stripHqControlChars(row.email, 120);
    const given = stripHqControlChars(row.full_name ?? row.fullName, 80);
    const familyName = stripHqControlChars((row as { familyName?: unknown }).familyName, 80);
    const createdAtRaw = row.created_at ?? row.createdAt;
    const createdAt =
        typeof createdAtRaw === 'string' && createdAtRaw.trim()
            ? createdAtRaw.trim().slice(0, 40)
            : createdAtRaw instanceof Date
              ? createdAtRaw.toISOString()
              : new Date(0).toISOString();

    return {
        id,
        email,
        fullName: given || email.split('@')[0] || '—',
        familyName,
        phone: stripHqControlChars((row as { phone?: unknown }).phone, 20),
        governorate: stripHqControlChars((row as { governorate?: unknown }).governorate, 40),
        lawyerBarRoom: stripHqControlChars((row as { lawyerBarRoom?: unknown }).lawyerBarRoom, 80),
        role: mapRoleFromRow(row),
        status: mapStatusFromRow(row),
        createdAt,
        freezeUntil: mapFreezeUntil(row),
        loginUntil: mapOptionalIso((row as { loginUntil?: unknown }).loginUntil),
        loginBlocked: (row as { loginBlocked?: unknown }).loginBlocked === true,
        isDeleted: (row as { isDeleted?: unknown }).isDeleted === true,
        verificationStatus: parseAdminVerificationStatus(
            (row as { verificationStatus?: unknown }).verificationStatus,
        ),
        publicVerifiedBadge: (row as { publicVerifiedBadge?: unknown }).publicVerifiedBadge === true,
        previousLegalDisplayName:
            stripHqControlChars((row as { previousLegalDisplayName?: unknown }).previousLegalDisplayName, 80) ||
            null,
        legalDisplayNameCorrectedAt: mapOptionalIso(
            (row as { legalDisplayNameCorrectedAt?: unknown }).legalDisplayNameCorrectedAt,
        ),
        legalDisplayNameCorrections:
            Number((row as { legalDisplayNameCorrections?: unknown }).legalDisplayNameCorrections ?? 0) >= 1
                ? 1
                : 0,
        kycSubmittedName:
            stripHqControlChars((row as { kycSubmittedName?: unknown }).kycSubmittedName, 80) || null,
    };
}

function mapOptionalIso(raw: unknown): string | null {
    if (raw == null || String(raw).trim() === '') return null;
    const iso = String(raw).trim().slice(0, 40);
    return Number.isNaN(Date.parse(iso)) ? null : iso;
}

function mapFreezeUntil(row: HqUserRow): string | null {
    const raw = (row as { freezeUntil?: unknown; freeze_until?: unknown }).freezeUntil
        ?? (row as { freeze_until?: unknown }).freeze_until;
    return mapOptionalIso(raw);
}

function mapAdminUsers(data: unknown): AdminUser[] {
    if (!Array.isArray(data)) return [];
    const out: AdminUser[] = [];
    for (const item of data) {
        if (!item || typeof item !== 'object') continue;
        const mapped = mapAdminUser(item as HqUserRow);
        if (mapped) out.push(mapped);
    }
    return out;
}

function mapSingleAdminUser(data: unknown): AdminUser {
    const list = mapAdminUsers(Array.isArray(data) ? data : data != null ? [data] : []);
    if (list.length === 0) {
        throw new Error('لم يُرجع الخادم بيانات المستخدم المحدَّث');
    }
    return list[0]!;
}

function mapActivity(raw: unknown): import('@/app/domain/admin/HqAccountActivity').HqAccountActivity {
    const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const timelineRaw = Array.isArray(rec.timeline) ? rec.timeline : [];
    const timeline = timelineRaw.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const row = item as Record<string, unknown>;
        const at = String(row.at ?? '').trim();
        const label = String(row.label ?? '').trim();
        if (!at || !label) return [];
        return [
            {
                at,
                kind: String(row.kind ?? '').trim() || 'event',
                label,
                detail: typeof row.detail === 'string' && row.detail.trim() ? row.detail.trim() : null,
            },
        ];
    });
    const asCount = (value: unknown): number | null =>
        typeof value === 'number' && Number.isFinite(value) ? value : null;
    const asIso = (value: unknown): string | null => {
        if (typeof value !== 'string' || !value.trim()) return null;
        return Number.isNaN(Date.parse(value)) ? null : value.trim();
    };
    return {
        createdAt: asIso(rec.createdAt),
        lastSignInAt: asIso(rec.lastSignInAt),
        emailConfirmedAt: asIso(rec.emailConfirmedAt),
        bannedUntil: asIso(rec.bannedUntil),
        sessionCount: asCount(rec.sessionCount),
        forumPosts: asCount(rec.forumPosts),
        forumComments: asCount(rec.forumComments),
        forumBanned: typeof rec.forumBanned === 'boolean' ? rec.forumBanned : null,
        forumBanReason: typeof rec.forumBanReason === 'string' ? rec.forumBanReason : null,
        forumBanExpiresAt: asIso(rec.forumBanExpiresAt),
        lastDevice: typeof rec.lastDevice === 'string' && rec.lastDevice.trim() ? rec.lastDevice.trim() : null,
        lastIp: typeof rec.lastIp === 'string' && rec.lastIp.trim() ? rec.lastIp.trim() : null,
        lastPlace: typeof rec.lastPlace === 'string' && rec.lastPlace.trim() ? rec.lastPlace.trim() : null,
        connections: Array.isArray(rec.connections)
            ? rec.connections.flatMap((item) => {
                  if (!item || typeof item !== 'object') return [];
                  const row = item as Record<string, unknown>;
                  const at = String(row.at ?? '').trim();
                  const deviceLabel = String(row.deviceLabel ?? '').trim();
                  if (!at || !deviceLabel) return [];
                  const sourceRaw = String(row.source ?? '').trim();
                  const source =
                      sourceRaw === 'login' ||
                      sourceRaw === 'signup' ||
                      sourceRaw === 'refresh' ||
                      sourceRaw === 'session'
                          ? sourceRaw
                          : 'session';
                  return [
                      {
                          at,
                          deviceLabel,
                          ip: typeof row.ip === 'string' && row.ip.trim() ? row.ip.trim() : null,
                          place: typeof row.place === 'string' && row.place.trim() ? row.place.trim() : 'غير معروف',
                          source,
                      },
                  ];
              }).slice(0, 8)
            : [],
        timeline,
        gaps: Array.isArray(rec.gaps)
            ? rec.gaps.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            : [],
    };
}

function wrapHqError(error: unknown, fallback: string): Error {
    if (error instanceof HqStepUpCancelledError) return error;
    if (isHqAbortError(error)) {
        return error instanceof Error
            ? error
            : Object.assign(new Error('hq-directory-timeout'), { name: 'AbortError' });
    }
    if (error instanceof SecureFetchError) {
        return new Error(toSafeMessageFromFetch(error, fallback));
    }
    if (error instanceof Error) return error;
    return new Error(toSafeMessage(error, fallback));
}

/**
 * مستودع مقر القيادة عن بعد:
 * كل قراءة/حظر/دور عبر BFF (Wife + مدير منصّة + جهاز OTP موثّق).
 * لا RPC من المتصفح.
 */
export class SupabaseAdminRepository extends IAdminRepository {
    async fetchDirectory(
        signal?: AbortSignal,
        query: HqDirectoryListQuery = EMPTY_HQ_DIRECTORY_QUERY,
    ): Promise<{
        users: AdminUser[];
        capped: boolean;
        matched: number;
        usersTotal: number;
        hasMore: boolean;
        matchedExact: boolean;
        offset: number;
        limit: number;
    }> {
        try {
            const result = await hqMutatingFetch<{
                ok?: boolean;
                users?: unknown;
                capped?: boolean;
                total?: unknown;
                usersTotal?: unknown;
                hasMore?: unknown;
                matchedExact?: unknown;
                offset?: unknown;
                limit?: unknown;
                error?: string;
            }>(hqDirectorySearchParams(query), {
                method: 'GET',
                cache: 'no-store',
                ...(signal ? { signal } : {}),
            });
            if (!result?.ok) {
                throw new Error(result?.error || 'فشل جلب قائمة المستخدمين');
            }
            const users = mapAdminUsers(result.users);
            const offset = Number(result.offset);
            const limit = Number(result.limit);
            const matched = Number(result.total);
            const usersTotal = Number(result.usersTotal);
            return {
                users,
                capped: result.capped === true,
                matched: Number.isFinite(matched) ? matched : users.length,
                usersTotal: Number.isFinite(usersTotal) ? usersTotal : users.length,
                hasMore: result.hasMore === true,
                matchedExact: result.matchedExact === true,
                offset: Number.isFinite(offset) ? offset : 0,
                limit: Number.isFinite(limit) && limit > 0 ? limit : HQ_DIRECTORY_PAGE_SIZE,
            };
        } catch (error) {
            throw wrapHqError(error, 'فشل جلب قائمة المستخدمين');
        }
    }

    async changeUserRole(userId: string, role: AdminUserRole): Promise<AdminUser> {
        const targetId = String(userId ?? '').trim();
        if (!targetId) {
            throw new Error('معرّف المستخدم مطلوب');
        }
        if (!isHeadquartersAssignableRole(role)) {
            throw new Error('دور غير مسموح');
        }

        try {
            const result = await hqMutatingFetch<{
                ok?: boolean;
                user?: unknown;
                error?: string;
            }>('/api/admin/role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: targetId, role }),
            });
            if (!result?.ok) {
                throw new Error(result?.error || 'فشل تحديث صلاحية المستخدم');
            }
            return mapSingleAdminUser(result.user);
        } catch (error) {
            throw wrapHqError(error, 'فشل تحديث صلاحية المستخدم');
        }
    }

    async freezeAccount(userId: string, durationHours: 0 | 24 | 72 | 168): Promise<AdminUser> {
        const targetId = String(userId ?? '').trim();
        if (!targetId) throw new Error('معرّف المستخدم مطلوب');
        if (durationHours !== 0 && durationHours !== 24 && durationHours !== 72 && durationHours !== 168) {
            throw new Error('مدة التجميد غير صالحة');
        }
        try {
            const result = await hqMutatingFetch<{
                ok?: boolean;
                user?: unknown;
                error?: string;
            }>('/api/admin/account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'freeze', targetUserId: targetId, durationHours }),
            });
            if (!result?.ok) {
                throw new Error(result?.error || 'فشل تجميد الحساب');
            }
            return mapSingleAdminUser(result.user);
        } catch (error) {
            throw wrapHqError(error, 'فشل تجميد الحساب');
        }
    }

    async unfreezeAccount(userId: string): Promise<AdminUser> {
        const targetId = String(userId ?? '').trim();
        if (!targetId) throw new Error('معرّف المستخدم مطلوب');
        try {
            const result = await hqMutatingFetch<{
                ok?: boolean;
                user?: unknown;
                error?: string;
            }>('/api/admin/account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'unfreeze', targetUserId: targetId }),
            });
            if (!result?.ok) {
                throw new Error(result?.error || 'فشل إلغاء التجميد');
            }
            return mapSingleAdminUser(result.user);
        } catch (error) {
            throw wrapHqError(error, 'فشل إلغاء التجميد');
        }
    }

    async revokeUserSessions(userId: string): Promise<AdminUser | null> {
        const targetId = String(userId ?? '').trim();
        if (!targetId) throw new Error('معرّف المستخدم مطلوب');
        try {
            const result = await hqMutatingFetch<{
                ok?: boolean;
                user?: unknown;
                error?: string;
            }>('/api/admin/account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'revoke_sessions', targetUserId: targetId }),
            });
            if (!result?.ok) {
                throw new Error(result?.error || 'فشل إنهاء الجلسات');
            }
            try {
                return mapSingleAdminUser(result.user);
            } catch {
                return null;
            }
        } catch (error) {
            throw wrapHqError(error, 'فشل إنهاء الجلسات');
        }
    }

    async setUserPassword(userId: string, password: string): Promise<AdminUser | null> {
        const targetId = String(userId ?? '').trim();
        if (!targetId) throw new Error('معرّف المستخدم مطلوب');
        const nextPassword = String(password ?? '');
        if (!nextPassword) throw new Error('كلمة المرور مطلوبة');
        try {
            const result = await hqMutatingFetch<{
                ok?: boolean;
                user?: unknown;
                error?: string;
            }>('/api/admin/account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'set_password',
                    targetUserId: targetId,
                    password: nextPassword,
                }),
            });
            if (!result?.ok) {
                throw new Error(result?.error || 'فشل تحديث كلمة المرور');
            }
            try {
                return mapSingleAdminUser(result.user);
            } catch {
                return null;
            }
        } catch (error) {
            throw wrapHqError(error, 'فشل تحديث كلمة المرور');
        }
    }

    async sendSystemNotice(input: {
        scope: 'all' | 'users';
        userIds?: string[];
        title: string;
        message: string;
    }): Promise<{ sent: number; failed: number; capped: boolean }> {
        const title = String(input.title ?? '').trim();
        const message = String(input.message ?? '').trim();
        if (!title || !message) throw new Error('العنوان والنص مطلوبان');
        if (input.scope !== 'all' && input.scope !== 'users') {
            throw new Error('نطاق الإرسال غير صالح');
        }
        try {
            const result = await hqMutatingFetch<{
                ok?: boolean;
                sent?: number;
                failed?: number;
                capped?: boolean;
                error?: string;
            }>('/api/admin/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scope: input.scope,
                    userIds: input.scope === 'users' ? input.userIds ?? [] : undefined,
                    title,
                    message,
                }),
            });
            if (!result?.ok) {
                throw new Error(result?.error || 'فشل إرسال إشعار النظام');
            }
            return {
                sent: typeof result.sent === 'number' ? result.sent : 0,
                failed: typeof result.failed === 'number' ? result.failed : 0,
                capped: result.capped === true,
            };
        } catch (error) {
            throw wrapHqError(error, 'فشل إرسال إشعار النظام');
        }
    }

    private async postAccount(
        body: Record<string, unknown>,
        fallback: string,
    ): Promise<AdminUser> {
        const result = await hqMutatingFetch<{
            ok?: boolean;
            user?: unknown;
            error?: string;
        }>('/api/admin/account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!result?.ok) {
            throw new Error(result?.error || fallback);
        }
        return mapSingleAdminUser(result.user);
    }

    async lockLogin(userId: string, durationHours: 0 | 24 | 72 | 168): Promise<AdminUser> {
        const targetId = String(userId ?? '').trim();
        if (!targetId) throw new Error('معرّف المستخدم مطلوب');
        try {
            return await this.postAccount(
                { action: 'lock_login', targetUserId: targetId, durationHours },
                'فشل قفل الدخول',
            );
        } catch (error) {
            throw wrapHqError(error, 'فشل قفل الدخول');
        }
    }

    async unlockLogin(userId: string): Promise<AdminUser> {
        const targetId = String(userId ?? '').trim();
        if (!targetId) throw new Error('معرّف المستخدم مطلوب');
        try {
            return await this.postAccount({ action: 'unlock_login', targetUserId: targetId }, 'فشل فتح الدخول');
        } catch (error) {
            throw wrapHqError(error, 'فشل فتح الدخول');
        }
    }

    async softDeleteAccount(userId: string): Promise<AdminUser> {
        const targetId = String(userId ?? '').trim();
        if (!targetId) throw new Error('معرّف المستخدم مطلوب');
        try {
            return await this.postAccount({ action: 'soft_delete', targetUserId: targetId }, 'فشل حذف الحساب');
        } catch (error) {
            throw wrapHqError(error, 'فشل حذف الحساب');
        }
    }

    async restoreAccount(userId: string): Promise<AdminUser> {
        const targetId = String(userId ?? '').trim();
        if (!targetId) throw new Error('معرّف المستخدم مطلوب');
        try {
            return await this.postAccount({ action: 'restore', targetUserId: targetId }, 'فشل استعادة الحساب');
        } catch (error) {
            throw wrapHqError(error, 'فشل استعادة الحساب');
        }
    }

    async banForum(userId: string, reason: string, durationHours?: 0 | 24 | 72 | 168): Promise<AdminUser> {
        const targetId = String(userId ?? '').trim();
        if (!targetId) throw new Error('معرّف المستخدم مطلوب');
        try {
            return await this.postAccount(
                {
                    action: 'forum_ban',
                    targetUserId: targetId,
                    reason,
                    durationHours,
                },
                'فشل حظر المنتدى',
            );
        } catch (error) {
            throw wrapHqError(error, 'فشل حظر المنتدى');
        }
    }

    async unbanForum(userId: string): Promise<AdminUser> {
        const targetId = String(userId ?? '').trim();
        if (!targetId) throw new Error('معرّف المستخدم مطلوب');
        try {
            return await this.postAccount({ action: 'forum_unban', targetUserId: targetId }, 'فشل رفع حظر المنتدى');
        } catch (error) {
            throw wrapHqError(error, 'فشل رفع حظر المنتدى');
        }
    }

    async setPublicVerifiedBadge(userId: string, shown: boolean): Promise<AdminUser> {
        const targetId = String(userId ?? '').trim();
        if (!targetId) throw new Error('معرّف المستخدم مطلوب');
        try {
            return await this.postAccount(
                { action: 'public_badge', targetUserId: targetId, shown: shown === true },
                'فشل تحديث علامة التوثيق',
            );
        } catch (error) {
            throw wrapHqError(error, 'فشل تحديث علامة التوثيق');
        }
    }

    async fetchAccountActivity(
        userId: string,
        signal?: AbortSignal,
    ): Promise<{ user: AdminUser; activity: import('@/app/domain/admin/HqAccountActivity').HqAccountActivity }> {
        const targetId = String(userId ?? '').trim();
        if (!targetId) throw new Error('معرّف المستخدم مطلوب');
        try {
            const result = await hqMutatingFetch<{
                ok?: boolean;
                user?: unknown;
                activity?: unknown;
                error?: string;
            }>(
                `/api/admin/account?targetUserId=${encodeURIComponent(targetId)}`,
                signal ? { method: 'GET', signal } : { method: 'GET' },
            );
            if (!result?.ok) {
                throw new Error(result?.error || 'فشل جلب سجل الحساب');
            }
            return {
                user: mapSingleAdminUser(result.user),
                activity: mapActivity(result.activity),
            };
        } catch (error) {
            throw wrapHqError(error, 'فشل جلب سجل الحساب');
        }
    }
}

/** نسخة مفردة جاهزة للعرض — يمكن حقن بديل في الاختبارات عبر hook. */
export const supabaseAdminRepository = new SupabaseAdminRepository();
