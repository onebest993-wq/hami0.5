/** تصحيح الاسم الثلاثي مرة واحدة — المصدر الكانوني على الخادم لا JWT. */

export const DISPLAY_NAME_MAX_LEN = 80;
export const DISPLAY_NAME_PREVIOUS_VISIBLE_MS = 30 * 24 * 60 * 60 * 1000;

export const DISPLAY_NAME_REGISTER_NOTE =
    'تأكّد من الاسم الثلاثي كما في الهوية. يمكن تصحيحه مرة واحدة فقط لاحقاً من الملف الشخصي.';

export const DISPLAY_NAME_EDIT_NOTE =
    'تصحيح الاسم متاح مرة واحدة فقط. بعد الحفظ لا يمكن تغييره.';

export const DISPLAY_NAME_USED_NOTE = 'استُنفد التصحيح الوحيد لهذا الحساب.';

export function normalizeLegalDisplayName(raw: unknown): string {
    return String(raw ?? '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, DISPLAY_NAME_MAX_LEN);
}

export function previousDisplayNameVisibleUntil(
    correctedAt: string | null | undefined,
    now = Date.now(),
): string | null {
    if (!correctedAt) return null;
    const at = Date.parse(correctedAt);
    if (!Number.isFinite(at)) return null;
    const until = at + DISPLAY_NAME_PREVIOUS_VISIBLE_MS;
    if (now >= until) return null;
    return new Date(until).toISOString();
}

export function previousDisplayNamePublic(
    previous: string | null | undefined,
    correctedAt: string | null | undefined,
    now = Date.now(),
): string | null {
    if (!previousDisplayNameVisibleUntil(correctedAt, now)) return null;
    const name = normalizeLegalDisplayName(previous);
    return name || null;
}

export type DisplayNamePolicy = {
    fullName: string;
    previousFullName: string | null;
    previousVisibleUntil: string | null;
    correctionUsed: boolean;
    canCorrect: boolean;
    correctedAt: string | null;
};

export function toDisplayNamePolicy(
    input: {
        fullName?: string | null;
        previousFullName?: string | null;
        correctedAt?: string | null;
        corrections?: number | null;
    },
    now = Date.now(),
): DisplayNamePolicy {
    const fullName = normalizeLegalDisplayName(input.fullName);
    const corrections = Number(input.corrections ?? 0);
    const correctionUsed = corrections >= 1;
    const previousFullName = previousDisplayNamePublic(input.previousFullName, input.correctedAt, now);
    return {
        fullName,
        previousFullName,
        previousVisibleUntil: previousDisplayNameVisibleUntil(input.correctedAt, now),
        correctionUsed,
        canCorrect: !correctionUsed,
        correctedAt: input.correctedAt?.trim() || null,
    };
}
