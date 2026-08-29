import { useMemo } from 'react';
import {
    buildDebtorSummonsProfileBundle,
    type BuildDebtorSummonsProfileBundleInput,
} from '@/app/application/execution/followup/buildDebtorSummonsProfileBundle';

export function useDebtorSummonsProfile(
    debtors: BuildDebtorSummonsProfileBundleInput['debtors'],
    principalDebtAmount: number,
    parsedLawyerFees: number,
    claimType: string | undefined,
    isNonFinancialClaim: boolean,
    debtorBrowserTabsMode: boolean,
    activeWorkspaceDebtorForFollowup: BuildDebtorSummonsProfileBundleInput['activeWorkspaceDebtorForFollowup'],
) {
    return useMemo(
        () =>
            buildDebtorSummonsProfileBundle({
                debtors,
                principalDebtAmount,
                parsedLawyerFees,
                claimType,
                isNonFinancialClaim,
                debtorBrowserTabsMode,
                activeWorkspaceDebtorForFollowup,
            }),
        [
            debtors,
            principalDebtAmount,
            parsedLawyerFees,
            claimType,
            isNonFinancialClaim,
            debtorBrowserTabsMode,
            activeWorkspaceDebtorForFollowup,
        ],
    );
}
