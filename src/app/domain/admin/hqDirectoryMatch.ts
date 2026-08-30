import type { AdminUser, AdminUserRole } from '@/app/domain/admin/AdminUser';
import {
    HQ_DIRECTORY_QUERY_MAX,
    type HqUserCreatedFilter,
    type HqUserStatusFilter,
} from '@/app/domain/admin/hqDirectoryQuery';
import { hqLiveNameDivergesFromKyc } from '@/app/domain/admin/hqLiveVsKycName';
import {
    hqDirectoryStatusLabel,
    hqUserPresenceLabel,
    resolveHqUserPresence,
} from '@/app/domain/admin/hqUserPresence';

const ROLE_SEARCH: Record<AdminUserRole, string> = {
    lawyer: 'محامي lawyer',
    admin: 'اداره إدارة admin',
    moderator: 'مشرف moderator',
};

const VERIFY_SEARCH: Record<AdminUser['verificationStatus'], string> = {
    none: 'بلا طلب غير موثق none',
    pending: 'قيد التدقيق pending',
    active: 'معتمد active',
    rejected: 'مرفوض rejected',
};

const DIGIT_AR = '٠١٢٣٤٥٦٧٨٩';
const DIGIT_FA = '۰۱۲۳۴۵۶۷۸۹';

export function foldHqUserSearchText(raw: unknown): string {
    return String(raw ?? '')
        .toLowerCase()
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/[ىي]/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/[٠-٩]/g, (ch) => String(DIGIT_AR.indexOf(ch)))
        .replace(/[۰-۹]/g, (ch) => String(DIGIT_FA.indexOf(ch)));
}

export function matchesHqUserQuery(user: AdminUser, query: string): boolean {
    const q = foldHqUserSearchText(query).trim().slice(0, HQ_DIRECTORY_QUERY_MAX);
    if (!q) return true;
    const presence = hqUserPresenceLabel(resolveHqUserPresence(user));
    const hay = foldHqUserSearchText(
        [
            user.fullName,
            user.previousLegalDisplayName,
            user.legalDisplayNameCorrections ? 'تصحيح الاسم اسم سابق' : '',
            user.kycSubmittedName,
            hqLiveNameDivergesFromKyc(user.fullName, user.kycSubmittedName)
                ? 'اختلاف الاسم طلب التوثيق'
                : '',
            user.familyName,
            user.email,
            user.phone,
            user.governorate,
            user.lawyerBarRoom,
            user.role,
            user.id,
            ROLE_SEARCH[user.role],
            presence,
            hqDirectoryStatusLabel(user),
            user.verificationStatus,
            VERIFY_SEARCH[user.verificationStatus],
        ].join(' '),
    );
    const tokens = q.split(/\s+/).filter(Boolean);
    return tokens.every((token) => hay.includes(token));
}

export function matchesHqUserStatusFilter(
    user: Pick<
        AdminUser,
        | 'role'
        | 'status'
        | 'verificationStatus'
        | 'isDeleted'
        | 'loginBlocked'
        | 'loginUntil'
        | 'fullName'
        | 'kycSubmittedName'
    >,
    filter: HqUserStatusFilter,
): boolean {
    if (filter === 'all') return true;
    if (filter === 'name_mismatch') return hqLiveNameDivergesFromKyc(user.fullName, user.kycSubmittedName);
    const presence = resolveHqUserPresence(user);
    if (filter === 'frozen') return presence === 'frozen';
    if (filter === 'locked') return presence === 'locked';
    if (filter === 'deleted') return presence === 'deleted';
    return presence === filter;
}

const WINDOW_MS: Record<Exclude<HqUserCreatedFilter, 'all'>, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
};

export function matchesHqUserCreatedFilter(
    createdAt: string,
    filter: HqUserCreatedFilter,
    nowMs = Date.now(),
): boolean {
    if (filter === 'all') return true;
    const createdMs = Date.parse(createdAt);
    if (!Number.isFinite(createdMs)) return false;
    return createdMs >= nowMs - WINDOW_MS[filter];
}
