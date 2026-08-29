import type { AdminUser, AdminVerificationStatus } from '@/app/domain/admin/AdminUser';

export type HqUserPresence =
    | 'active'
    | 'frozen'
    | 'pending'
    | 'unsubmitted'
    | 'rejected'
    | 'locked'
    | 'deleted';

export function parseAdminVerificationStatus(raw: unknown): AdminVerificationStatus {
    if (raw === 'pending' || raw === 'active' || raw === 'rejected') return raw;
    return 'none';
}

/**
 * KV أولاً إن وُجد صف بحالة صالحة.
 * إن غاب الصف (KV نجح بلا قيمة) أو تعذّر الخزن → app_metadata — ليس user_metadata.
 */
export function resolveHqDirectoryKycStatus(
    kvValue: unknown,
    kvAvailable: boolean,
    appMetadataStatus: unknown = 'none',
): AdminVerificationStatus {
    if (kvAvailable) {
        const fromKv = parseAdminVerificationStatus(kvValue);
        if (fromKv !== 'none') return fromKv;
    }
    return parseAdminVerificationStatus(appMetadataStatus);
}

export function resolveHqUserPresence(
    user: Pick<AdminUser, 'role' | 'status' | 'verificationStatus'> &
        Pick<AdminUser, 'isDeleted' | 'loginBlocked' | 'loginUntil'>,
): HqUserPresence {
    if (user.isDeleted) return 'deleted';
    const loginUntilMs = user.loginUntil ? Date.parse(user.loginUntil) : NaN;
    const loginLocked = user.loginBlocked === true || (Number.isFinite(loginUntilMs) && loginUntilMs > Date.now());
    if (loginLocked) return 'locked';
    if (user.status === 'suspended') return 'frozen';
    if (user.role === 'lawyer') {
        if (user.verificationStatus === 'rejected') return 'rejected';
        if (user.verificationStatus === 'pending') return 'pending';
        if (user.verificationStatus !== 'active') return 'unsubmitted';
    }
    return 'active';
}

export function hqUserPresenceLabel(kind: HqUserPresence): string {
    if (kind === 'deleted') return 'محذوف';
    if (kind === 'locked') return 'مقفل الدخول';
    if (kind === 'frozen') return 'موقوف';
    if (kind === 'pending') return 'قيد التدقيق';
    if (kind === 'unsubmitted') return 'بلا طلب';
    if (kind === 'rejected') return 'مرفوض';
    return 'نشط';
}

/** شارة الدليل — نفس ألفاظ تبويب التوثيق للمحامي */
export function hqDirectoryStatusLabel(
    user: Pick<AdminUser, 'role' | 'status' | 'verificationStatus' | 'isDeleted' | 'loginBlocked' | 'loginUntil'>,
): string {
    const kind = resolveHqUserPresence(user);
    if (kind === 'active' && user.role === 'lawyer') return 'معتمد';
    return hqUserPresenceLabel(kind);
}

export function isHqDirectoryActive(
    user: Pick<AdminUser, 'role' | 'status' | 'verificationStatus' | 'isDeleted' | 'loginBlocked' | 'loginUntil'>,
): boolean {
    return resolveHqUserPresence(user) === 'active';
}

/** علامة التوثيق العامة — يضعها المقر يدوياً، ليست حالة اعتماد الهوية */
export function isAccreditedLawyer(
    user: Pick<AdminUser, 'role' | 'isDeleted' | 'publicVerifiedBadge'>,
): boolean {
    return user.role === 'lawyer' && user.publicVerifiedBadge === true && user.isDeleted !== true;
}
