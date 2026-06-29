import type { FollowupSpecializationVisibility } from '@/app/utils/followupSpecializationVisibility';

/** حد فتح التنفيذ الجبري الشخصي للكاسب — مبلغ المركز المالي يتجاوز 250,000 د.ع */
export const EARNER_PERSONAL_COERCIVE_MIN_IQD = 250_000;

/** حد إظهار قرار القاضي بالحبس التنفيذي — 500,000 د.ع فأكثر */
export const EARNER_EXECUTIVE_DETENTION_MIN_IQD = 500_000;

export interface EarnerFinancialCoerciveGateInput {
    isEmployee: boolean;
    /** متبقي المركز المالي الموحّد (د.ع) */
    financialCenterTotalIqd: number;
}

export function normalizeFinancialCenterIqd(value: unknown): number {
    return Math.max(0, Math.round(Number(value) || 0));
}

export function meetsEarnerPersonalCoerciveFinancialThreshold(totalIqd: number): boolean {
    return normalizeFinancialCenterIqd(totalIqd) > EARNER_PERSONAL_COERCIVE_MIN_IQD;
}

export function meetsEarnerExecutiveDetentionThreshold(totalIqd: number): boolean {
    return normalizeFinancialCenterIqd(totalIqd) >= EARNER_EXECUTIVE_DETENTION_MIN_IQD;
}

/** فتح تبويب التنفيذ الجبري الشخصي — كاسب + مركز مالي > 250,000 + متبقٍ قائم */
export function shouldUnlockEarnerPersonalCoerciveFromFinancialCenter(
    input: EarnerFinancialCoerciveGateInput
): boolean {
    if (input.isEmployee) return false;
    const total = normalizeFinancialCenterIqd(input.financialCenterTotalIqd);
    return meetsEarnerPersonalCoerciveFinancialThreshold(total) && total > 0;
}

/** قرار القاضي بالحبس — كاسب + مركز مالي ≥ 500,000 */
export function shouldShowEarnerExecutiveDetentionFromFinancialCenter(
    input: EarnerFinancialCoerciveGateInput
): boolean {
    if (input.isEmployee) return false;
    if (!shouldUnlockEarnerPersonalCoerciveFromFinancialCenter(input)) return false;
    return meetsEarnerExecutiveDetentionThreshold(input.financialCenterTotalIqd);
}

/**
 * طبقة عامة على أعلام محضر المتابعة — تُطبَّق على كل أنواع المطالبات عند استيفاء حدّ المركز المالي.
 */
export function applyEarnerFinancialPersonalCoerciveOverlay(
    flags: FollowupSpecializationVisibility,
    input: EarnerFinancialCoerciveGateInput
): FollowupSpecializationVisibility {
    if (!shouldUnlockEarnerPersonalCoerciveFromFinancialCenter(input)) {
        return flags;
    }
    return {
        ...flags,
        hidePersonalCoerciveFollowupTab: false,
        hidePersonalForcedBringActivation: false,
        hidePersonalJudgePresentation: false,
        suppressHiddenPersonalCoerciveRequests: false,
        hideFollowupCoerciveTab: false,
        hideFollowupSeizureRequestsTab: false,
        isFinancialDebtCollection: true,
    };
}