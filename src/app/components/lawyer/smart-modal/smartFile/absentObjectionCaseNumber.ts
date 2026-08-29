import { isAbsentObjectionStageName } from './absentJudgmentStageNames';

/** علامة سجل المحكمة لدعوى الاعتراض على الحكم الغيابي */
export const ABSENT_OBJECTION_CASE_MARK = 'اعتراضية';

const WESTERN_YEAR = /^\d{4}$/;
const EASTERN_YEAR = /^[\u0660-\u0669]{4}$/;

function splitCaseNumberParts(raw: string): string[] {
    return String(raw ?? '')
        .trim()
        .split('/')
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
}

function isYearSegment(part: string): boolean {
    return WESTERN_YEAR.test(part) || EASTERN_YEAR.test(part);
}

export function shouldDeriveAbsentObjectionCaseNumber(appealType?: string | null): boolean {
    return isAbsentObjectionStageName(appealType);
}

/**
 * يحول رقم البداءة إلى رقم الدعوى الاعتراضية بإدراج «اعتراضية» قبل السنة.
 * مثال: 111/ب/2026 → 111/ب/اعتراضية/2026
 */
export function deriveAbsentObjectionCaseNumber(sourceCaseNo?: string | null): string {
    const parts = splitCaseNumberParts(String(sourceCaseNo ?? ''));
    if (parts.length === 0) return '';
    if (parts.includes(ABSENT_OBJECTION_CASE_MARK)) return parts.join('/');
    if (parts.length >= 2 && isYearSegment(parts[parts.length - 1])) {
        const year = parts[parts.length - 1];
        return [...parts.slice(0, -1), ABSENT_OBJECTION_CASE_MARK, year].join('/');
    }
    return [...parts, ABSENT_OBJECTION_CASE_MARK].join('/');
}

export function resolveAppealStageCaseNumber(
    _appealType: string | null | undefined,
    enteredCaseNo: string | null | undefined,
    _sourceCaseNo?: string | null | undefined,
): string {
    /*
     * لكل مرحلة رقمها الخاص: إن كُتب يُحفظ، وإلا يُترك فارغاً ويُضاف لاحقاً.
     * لا اشتقاق تلقائي لـ «اعتراضية» — يشوّه العرض ويفرض رقماً غير مؤكد.
     */
    return String(enteredCaseNo ?? '').trim();
}
