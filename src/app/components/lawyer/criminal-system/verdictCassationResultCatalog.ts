/**
 * كتالوج نتائج التمييز على بطاقة الحكم — نصّ خالص بلا trialSessionsEngine.
 * يكسر دورة: trialSessionsEngine ↔ verdictCassationResultEngine ↔ decisionAppealPeriodEngine.
 */

export const VERDICT_CASSATION_RESULT_OPTIONS = [
    { value: 'verdict_formal_dismissal', label: 'رد الطعن شكلاً' },
    { value: 'verdict_substantive_affirmation', label: 'تأييد القرار موضوعاً' },
    {
        value: 'verdict_quash_remand_retrial',
        label: 'نقض القرار وإعادة الأوراق لنفس المحكمة لإعادة المحاكمة',
    },
    {
        value: 'verdict_quash_referral_jurisdiction',
        label: 'نقض القرار وإحالة الدعوى لمحكمة أخرى لعدم الاختصاص',
    },
    {
        value: 'verdict_quash_modify_mitigate',
        label: 'نقض القرار وتعديله موضوعياً (تخفيف العقوبة / الإفراج)',
    },
    {
        value: 'verdict_quash_modify_aggravate',
        label: 'نقض القرار وتعديله موضوعياً (تشديد العقوبة)',
    },
] as const;

export type VerdictCassationResultValue = (typeof VERDICT_CASSATION_RESULT_OPTIONS)[number]['value'];

const LEGACY_RESULT_MAP: Record<string, VerdictCassationResultValue> = {
    procedural_affirmation: 'verdict_substantive_affirmation',
    affirmation: 'verdict_substantive_affirmation',
    'تأييد القرار': 'verdict_substantive_affirmation',
    quash_remand: 'verdict_quash_remand_retrial',
    'نقض القرار وإعادته': 'verdict_quash_remand_retrial',
    'نقض وإعادة': 'verdict_quash_remand_retrial',
};

export function coerceLegacyVerdictCassationResult(raw: string | undefined): VerdictCassationResultValue | '' {
    const key = String(raw ?? '').trim();
    if (!key) return '';
    const known = VERDICT_CASSATION_RESULT_OPTIONS.find((o) => o.value === key);
    if (known) return known.value;
    return LEGACY_RESULT_MAP[key] ?? '';
}

export function verdictCassationResultLabel(resultRaw: string | undefined): string {
    const key = String(resultRaw ?? '').trim();
    if (!key) return '—';
    const match = VERDICT_CASSATION_RESULT_OPTIONS.find((o) => o.value === key);
    if (match) return match.label;
    const coerced = coerceLegacyVerdictCassationResult(key);
    if (coerced) {
        return VERDICT_CASSATION_RESULT_OPTIONS.find((o) => o.value === coerced)?.label ?? key;
    }
    if (key === 'تأييد القرار') return 'تأييد القرار';
    if (/نقض.*إعادة/i.test(key)) return 'نقض القرار وإعادة الأوراق لنفس المحكمة لإعادة المحاكمة';
    return key;
}
