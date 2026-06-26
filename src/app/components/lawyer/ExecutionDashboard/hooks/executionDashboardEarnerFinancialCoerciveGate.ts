import { useMemo } from 'react';
import {
    meetsEarnerPersonalCoerciveFinancialThreshold,
    shouldShowEarnerExecutiveDetentionFromFinancialCenter,
    shouldUnlockEarnerPersonalCoerciveFromFinancialCenter,
    type EarnerFinancialCoerciveGateInput,
} from '@/app/utils/earnerPersonalCoerciveFinancialGate';

export function resolveEarnerFinancialPersonalCoerciveFlags(
    input: EarnerFinancialCoerciveGateInput,
): {
    earnerFinancialPersonalCoerciveActive: boolean;
    hideExecutiveDetentionJudgeCard: boolean;
    earnerPersonalCoerciveFinancialThresholdMet: boolean;
} {
    const earnerFinancialPersonalCoerciveActive =
        shouldUnlockEarnerPersonalCoerciveFromFinancialCenter(input);
    const showExecutiveDetentionJudgeCard =
        shouldShowEarnerExecutiveDetentionFromFinancialCenter(input);
    return {
        earnerFinancialPersonalCoerciveActive,
        hideExecutiveDetentionJudgeCard: !showExecutiveDetentionJudgeCard,
        earnerPersonalCoerciveFinancialThresholdMet:
            !input.isEmployee &&
            meetsEarnerPersonalCoerciveFinancialThreshold(input.financialCenterTotalIqd),
    };
}

export function useEarnerFinancialPersonalCoerciveFlags(
    isEmployee: boolean,
    financialCenterTotalIqd: number,
) {
    return useMemo(
        () =>
            resolveEarnerFinancialPersonalCoerciveFlags({
                isEmployee,
                financialCenterTotalIqd,
            }),
        [isEmployee, financialCenterTotalIqd],
    );
}
