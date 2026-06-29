import { DEV_MOCK_LAWYER_NAME, GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';

const STALE_PLACEHOLDER_NAMES = new Set(['', 'المحامي', 'محامٍ', 'محامٍ تجريبي', 'محامي تجريبي']);

function readMetadataName(meta?: Record<string, unknown>): string {
    if (!meta) return '';
    const candidates = [meta.fullName, meta.full_name, meta.name, meta.displayName];
    for (const value of candidates) {
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
}

/** اسم العرض في الهيدر والملف — يفضّل بيانات الجلسة التجريبية على الأسماء القديمة المحفوظة محلياً */
export function resolveLawyerDisplayName(
    profileName: string | undefined,
    userId?: string | null,
    meta?: Record<string, unknown>,
): string {
    const trimmedProfile = profileName?.trim() ?? '';
    const metaName = readMetadataName(meta);

    if (userId === GUEST_LAWYER_ID) {
        if (STALE_PLACEHOLDER_NAMES.has(trimmedProfile)) {
            return metaName || DEV_MOCK_LAWYER_NAME;
        }
    }

    if (trimmedProfile) return trimmedProfile;
    if (metaName) return metaName;
    return userId === GUEST_LAWYER_ID ? DEV_MOCK_LAWYER_NAME : 'المحامي';
}
