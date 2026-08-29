/**
 * قطعية الدعوى — بدائية بلا بوّابة الطعون غير العادية.
 *
 * بطاقة الأرشيف تحتاج فقط «هل اكتسبت الدرجة القطعية؟»؛ استيرادها من
 * `extraordinaryAppealGateway` كان يسحب تصنيف المرافعة وسلسلة الأحكام.
 */

export type DossierFinalityStage = { finalDecision?: string | null };

function isFinalityPhrase(value: unknown): boolean {
    const text = String(value ?? '').trim();
    if (!text) return false;
    return (
        text.includes('مكتسبة الدرجة القطعية')
        || text.includes('اكتسب الدرجة القطعية')
        || text.includes('اكتسب القرار الدرجة القطعية')
    );
}

export function isDossierFinalized(
    status: string | undefined,
    stages: readonly DossierFinalityStage[],
): boolean {
    if (isFinalityPhrase(status)) return true;
    return stages.some((stage) => isFinalityPhrase(stage?.finalDecision));
}
