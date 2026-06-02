/** أسباب انقضاء الدعوى — مادة 130 وما يماثلها */
export const STAGE_EXPIRATION_REASONS = [
    { value: 'death', label: 'وفاة المتهم' },
    { value: 'amnesty', label: 'صدور قانون عفو عام' },
    { value: 'statute_of_limitations', label: 'تقادم/مرور زمن' },
    { value: 'custom_manual', label: 'سبب آخر (إدخال يدوي)' },
] as const;

/** @deprecated — بيانات قديمة محفوظة للتوافق */
export const LEGACY_DECRIMINALIZATION_REASON = 'decriminalization';

export type StageExpirationReason = (typeof STAGE_EXPIRATION_REASONS)[number]['value'];

export function isStageExpirationReason(value: string): value is StageExpirationReason {
    return (
        STAGE_EXPIRATION_REASONS.some((r) => r.value === value) ||
        value === LEGACY_DECRIMINALIZATION_REASON
    );
}

export function stageExpirationReasonLabel(
    value: StageExpirationReason | typeof LEGACY_DECRIMINALIZATION_REASON | string,
    customDetail?: string,
): string {
    if (value === 'custom_manual') {
        const manual = String(customDetail ?? '').trim();
        return manual || 'سبب آخر (إدخال يدوي)';
    }
    if (value === LEGACY_DECRIMINALIZATION_REASON) return 'إلغاء النص العقابي';
    const hit = STAGE_EXPIRATION_REASONS.find((r) => r.value === value);
    return hit?.label ?? String(value ?? '');
}

export function validateExpirationReasonSelection(
    reason: string,
    customDetail?: string,
): string | null {
    if (!reason.trim()) return 'اختر سبب الانقضاء / سقوط الدعوى.';
    if (!isStageExpirationReason(reason)) return 'سبب الانقضاء غير صالح.';
    if (reason === 'custom_manual' && !String(customDetail ?? '').trim()) {
        return 'أدخل سبب الانقضاء يدوياً.';
    }
    return null;
}
