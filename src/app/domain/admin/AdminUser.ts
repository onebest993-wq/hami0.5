/**
 * Domain model — مستخدم كما تراه طبقة الإدارة (مقر القيادة).
 * المصدر الكانوني للصلاحية/الحالة: جدول `profiles` (+ بريد/اسم من auth عند التوافر).
 */

export type AdminUserRole = 'lawyer' | 'admin' | 'moderator';

export type AdminUserStatus = 'active' | 'suspended';

/** حالة توثيق المحامي في KV — ليست تجميد الحساب */
export type AdminVerificationStatus = 'pending' | 'active' | 'rejected' | 'none';

export interface AdminUser {
    id: string;
    email: string;
    fullName: string;
    familyName: string;
    phone: string;
    governorate: string;
    lawyerBarRoom: string;
    role: AdminUserRole;
    status: AdminUserStatus;
    createdAt: string;
    freezeUntil: string | null;
    loginUntil?: string | null;
    loginBlocked?: boolean;
    isDeleted?: boolean;
    verificationStatus: AdminVerificationStatus;
    /** علامة التوثيق العامة — يضعها المقر يدوياً، ليست اعتماد الهوية */
    publicVerifiedBadge?: boolean;
    previousLegalDisplayName?: string | null;
    legalDisplayNameCorrectedAt?: string | null;
    legalDisplayNameCorrections?: number;
    /** الاسم المكتوب على طلب التوثيق — للمقارنة مع الاسم الحي، لا بديلاً عنه */
    kycSubmittedName?: string | null;
}

export const ADMIN_USER_ROLES: readonly AdminUserRole[] = ['lawyer', 'admin', 'moderator'] as const;

/** أدوار يمكن تعيينها عن بعد من المقر — ترقية `admin` محظورة (مدير المنصّة عبر UUID فقط) */
export const HEADQUARTERS_ASSIGNABLE_ROLES: readonly Exclude<AdminUserRole, 'admin'>[] = [
    'lawyer',
    'moderator',
] as const;

export function composeLawyerDirectoryName(given: string, family: string, email: string): string {
    const name = [String(given ?? '').trim(), String(family ?? '').trim()].filter(Boolean).join(' ').trim();
    if (name) return name;
    const local = String(email ?? '').split('@')[0]?.trim() ?? '';
    return local || '—';
}

export function isAdminUserRole(value: unknown): value is AdminUserRole {
    return value === 'lawyer' || value === 'admin' || value === 'moderator';
}

export function isHeadquartersAssignableRole(
    value: unknown,
): value is Exclude<AdminUserRole, 'admin'> {
    return value === 'lawyer' || value === 'moderator';
}

export function isAdminUserStatus(value: unknown): value is AdminUserStatus {
    return value === 'active' || value === 'suspended';
}
