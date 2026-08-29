import { useMemo } from 'react';
import {
    meetsEarnerPersonalCoerciveFinancialThreshold,
    shouldShowEarnerExecutiveDetentionFromFinancialCenter,
    shouldUnlockEarnerPersonalCoerciveFromFinancialCenter,
    type EarnerFinancialCoerciveGateInput,
} from '@/app/utils/earnerPersonalCoerciveFinancialGate';

export type EarnerFinancialPersonalCoerciveFlagsInput = EarnerFinancialCoerciveGateInput & {
    /** استحصال/استخلاص دين مالي — قرار القاضي يُعرض مع عرض الإضبارة بغض النظر عن حدّ 500 ألف */
    isFinancialDebtCollection?: boolean;
    /** مدين متوفي — لا بوابة كاسب مالي */
    activeDebtorIsDeceased?: boolean;
};

/** قرار القاضي بالحبس — يُخفى فقط في مسار الكاسب العام دون مطالبة مالية صريحة */
function resolveHideExecutiveDetentionJudgeCard(
    input: EarnerFinancialPersonalCoerciveFlagsInput,
): boolean {
    if (input.isFinancialDebtCollection && !input.isEmployee) {
        return false;
    }
    return !shouldShowEarnerExecutiveDetentionFromFinancialCenter(input);
}

export function resolveEarnerFinancialPersonalCoerciveFlags(
    input: EarnerFinancialPersonalCoerciveFlagsInput,
): {
    earnerFinancialPersonalCoerciveActive: boolean;
    hideExecutiveDetentionJudgeCard: boolean;
    earnerPersonalCoerciveFinancialThresholdMet: boolean;
} {
    if (input.activeDebtorIsDeceased) {
        return {
            earnerFinancialPersonalCoerciveActive: false,
            hideExecutiveDetentionJudgeCard: true,
            earnerPersonalCoerciveFinancialThresholdMet: false,
        };
    }
    const earnerFinancialPersonalCoerciveActive =
        shouldUnlockEarnerPersonalCoerciveFromFinancialCenter(input);
    return {
        earnerFinancialPersonalCoerciveActive,
        hideExecutiveDetentionJudgeCard: resolveHideExecutiveDetentionJudgeCard(input),
        earnerPersonalCoerciveFinancialThresholdMet:
            !input.isEmployee &&
            meetsEarnerPersonalCoerciveFinancialThreshold(input.financialCenterTotalIqd),
    };
}

export function useEarnerFinancialPersonalCoerciveFlags(
    isEmployee: boolean,
    financialCenterTotalIqd: number,
    isFinancialDebtCollection = false,
    activeDebtorIsDeceased = false,
) {
    return useMemo(
        () =>
            resolveEarnerFinancialPersonalCoerciveFlags({
                isEmployee,
                financialCenterTotalIqd,
                isFinancialDebtCollection,
                activeDebtorIsDeceased,
            }),
        [isEmployee, financialCenterTotalIqd, isFinancialDebtCollection, activeDebtorIsDeceased],
    );
}
