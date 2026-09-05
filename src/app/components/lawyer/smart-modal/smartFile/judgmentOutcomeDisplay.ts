/** تسميات عرض لمنطوق الحكم — التخزين يبقى بالقيم القانونية القائمة. */

/** رد جزئي = إلزام جزئي موضوعي (من منظور الملزَم) — للعرض فقط */
export function formatJudgmentOutcomeDisplayLabel(judgmentType: string): string {
    const t = String(judgmentType ?? '').trim();
    if (!t) return t;
    if (t === 'رد الدعوى جزئياً' || (t.includes('رد') && t.includes('جزئ') && !t.includes('إلزام'))) {
        if (t.includes('إلزام')) return t;
        return 'رد الدعوى جزئياً (إلزام جزئي)';
    }
    return t;
}

export const BOUND_MERIT_PARTIAL_LABEL = 'إلزام جزئي';
export const BOUND_MERIT_FULL_LABEL = 'إلزام كامل';
export const PARTIAL_JUDGMENT_OPTION_LABEL = 'رد الدعوى جزئياً (إلزام جزئي / كسب وخسارة)';
