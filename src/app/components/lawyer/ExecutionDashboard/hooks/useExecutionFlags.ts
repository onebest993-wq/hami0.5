import { useMemo } from 'react';
import {
    isHybridFeesNonMonetaryPrincipal,
    executionMonetaryStrictPath,
} from '@/app/utils/debtorSummonsProfile';

import { hasOngoingAlimonyInExecution } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';

export function useExecutionFlags(
    executionData: unknown,
    debtorNotificationDate: string | null,
    effectiveDebtors: { notificationDate?: string | null }[],
    claimType: string | undefined,
    isNonFinancialClaim: boolean,
    principalDebtAmount: number,
    parsedLawyerFees: number,
) {
    const ed = executionData as Record<string, unknown> | null | undefined;

    const debtorNotifiedForEvictionGrace = useMemo(
        () =>
            Boolean(
                ed?.debtorNotificationDate ||
                    debtorNotificationDate ||
                    (effectiveDebtors[0] as { notificationDate?: string | null })?.notificationDate
            ),
        [ed?.debtorNotificationDate, debtorNotificationDate, effectiveDebtors]
    );

    const isAlimonyClaim = hasOngoingAlimonyInExecution(ed ?? null, claimType);

    const isHybridFeesNonMonetary = useMemo(
        () =>
            isHybridFeesNonMonetaryPrincipal({
                isNonFinancialClaim,
                parsedDebtAmount: principalDebtAmount,
                parsedLawyerFees,
            }),
        [isNonFinancialClaim, principalDebtAmount, parsedLawyerFees]
    );

    const monetaryExecutionStrictPathFlag = useMemo(
        () =>
            executionMonetaryStrictPath({
                parsedDebtAmount: principalDebtAmount,
                parsedLawyerFees,
                isHybridFeesNonMonetary,
            }),
        [principalDebtAmount, parsedLawyerFees, isHybridFeesNonMonetary]
    );

    const monetaryStrictForSummoningEngine = monetaryExecutionStrictPathFlag && !isAlimonyClaim;

    return {
        debtorNotifiedForEvictionGrace,
        isAlimonyClaim,
        isHybridFeesNonMonetary,
        monetaryExecutionStrictPathFlag,
        monetaryStrictForSummoningEngine,
    };
}
