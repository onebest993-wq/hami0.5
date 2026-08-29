import { DEV_MOCK_LAWYER_NAME, GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';
import { sanitizeProfilePlainText } from '@/app/services/profile/profileUrlSanitize';

const STALE_PLACEHOLDER_NAMES = new Set(['', 'المحامي', 'محامٍ', 'محامٍ تجريبي', 'محامي تجريبي']);

function readStringField(meta: Record<string, unknown>, key: string): string {
    const value = meta[key];
    return typeof value === 'string' ? value.trim() : '';
}

function pickLongestName(values: string[]): string {
    let best = '';
    for (const value of values) {
        if (value.length > best.length) best = value;
    }
    return best;
}

/** طيّ أشكال الألف/التاء حتى لا تُعتبر «احمد» و«أحمد مهدي» اسمين مختلفين. */
export function foldArabicIdentityLetters(value: string): string {
    return value
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/\s+/g, ' ')
        .trim();
}

/** بادئة بعد طيّ الهمزة — «احمد» تكمل إلى «أحمد مهدي» دون استبدال باسم أجنبي */
export function isNamePrefixEnrichment(current: string, next: string): boolean {
    const a = foldArabicIdentityLetters(current);
    const b = foldArabicIdentityLetters(next);
    if (!a || !b) return false;
    return b.startsWith(a) || a.startsWith(b);
}

function readCompleteMetadataName(meta?: Record<string, unknown>): string {
    if (!meta) return '';
    const given = readStringField(meta, 'given_name') || readStringField(meta, 'first_name');
    const family = readStringField(meta, 'family_name') || readStringField(meta, 'last_name');
    const composed = [given, family].filter(Boolean).join(' ').trim();
    return pickLongestName([
        readStringField(meta, 'fullName'),
        readStringField(meta, 'full_name'),
        composed,
    ]);
}

function readMetadataName(meta?: Record<string, unknown>): string {
    if (!meta) return '';
    const named = [
        readStringField(meta, 'fullName'),
        readStringField(meta, 'full_name'),
        readStringField(meta, 'name'),
        readStringField(meta, 'displayName'),
    ];
    const given = readStringField(meta, 'given_name') || readStringField(meta, 'first_name');
    const family = readStringField(meta, 'family_name') || readStringField(meta, 'last_name');
    const composed = [given, family].filter(Boolean).join(' ').trim();
    return pickLongestName([...named, composed]);
}

/**
 * يثبّت الاسم الظاهر: لا نرجع من كامل إلى بادئة أقصر (أحمد ← أحمد مهدي).
 * التغيير الحقيقي (اسم مختلف تماماً) يُطبَّق.
 */
function publicLawyerDisplayName(raw: string, fallback = ''): string {
    return sanitizeProfilePlainText(raw, 80).trim() || fallback;
}

export function preferRicherLawyerDisplayName(current: string, next: string): string {
    const a = current.trim();
    const b = next.trim();
    if (!b) return a;
    if (!a || STALE_PLACEHOLDER_NAMES.has(a)) return b;
    if (STALE_PLACEHOLDER_NAMES.has(b)) return a;
    if (a === b) return a;
    if (isNamePrefixEnrichment(a, b)) {
        return a.length >= b.length ? a : b;
    }
    return b;
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
            return publicLawyerDisplayName(metaName, DEV_MOCK_LAWYER_NAME);
        }
    }

    if (trimmedProfile && metaName) {
        if (isNamePrefixEnrichment(trimmedProfile, metaName)) {
            return publicLawyerDisplayName(preferRicherLawyerDisplayName(trimmedProfile, metaName), trimmedProfile);
        }
    }
    if (trimmedProfile) return publicLawyerDisplayName(trimmedProfile, userId === GUEST_LAWYER_ID ? DEV_MOCK_LAWYER_NAME : 'المحامي');
    if (metaName) return publicLawyerDisplayName(metaName, userId === GUEST_LAWYER_ID ? DEV_MOCK_LAWYER_NAME : 'المحامي');
    return userId === GUEST_LAWYER_ID ? DEV_MOCK_LAWYER_NAME : 'المحامي';
}

/**
 * اسم أول طلاء — الملف المحلي أو إغناء بادئة من الاسم الكامل في الجلسة.
 * لا يُستبدل اسم محفوظ باسم جلسة مختلف، ولا يُستخدم حقل `name` القصير وحده.
 */
export function resolveFirstPaintLawyerDisplayName(
    profileName: string | undefined,
    userId?: string | null,
    meta?: Record<string, unknown>,
): string {
    const trimmedProfile = profileName?.trim() ?? '';
    const complete = readCompleteMetadataName(meta);
    if (trimmedProfile && !STALE_PLACEHOLDER_NAMES.has(trimmedProfile)) {
        if (complete) {
            if (isNamePrefixEnrichment(trimmedProfile, complete)) {
                return publicLawyerDisplayName(
                    preferRicherLawyerDisplayName(trimmedProfile, complete),
                    trimmedProfile,
                );
            }
            return publicLawyerDisplayName(trimmedProfile);
        }
        const sessionShort = meta ? readStringField(meta, 'name') : '';
        if (
            sessionShort &&
            (trimmedProfile === sessionShort ||
                foldArabicIdentityLetters(trimmedProfile) === foldArabicIdentityLetters(sessionShort))
        ) {
            return '';
        }
        return publicLawyerDisplayName(trimmedProfile);
    }
    if (complete) return publicLawyerDisplayName(complete);
    if (userId === GUEST_LAWYER_ID) return DEV_MOCK_LAWYER_NAME;
    return '';
}
