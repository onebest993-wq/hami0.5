import { useMemo } from 'react';
import {
    getDebtorSummonsProfile,
    shouldShowEmployeeSalaryCapture,
} from '@/app/utils/debtorSummonsProfile';
import type { DebtorSummonsProfile } from '@/app/utils/debtorSummonsProfile';

export function useDebtorSummonsProfile(
    debtors: { occupation?: string }[],
    principalDebtAmount: number,
    parsedLawyerFees: number,
    claimType: string | undefined,
    isNonFinancialClaim: boolean,
    debtorBrowserTabsMode: boolean,
    activeWorkspaceDebtorForFollowup: { d: { occupation?: string }; isPrimary?: boolean } | null,
) {
    const debtorOccupation = debtors[0]?.occupation?.toLowerCase() || '';
    const isDebtorGovernmentEmployee = debtorOccupation.includes('موظف') || 
                                       debtorOccupation.includes('حكومي') || 
                                       debtorOccupation === 'موظف';
    const isDebtorFreelancer = debtorOccupation.includes('كاسب') || 
                              debtorOccupation.includes('خاص') || 
                              debtorOccupation === 'كاسب';

    const isDebtorRetired =
        debtorOccupation.includes('متقاعد') || debtorOccupation.includes('تقاعد');

    const debtorSummonsProfile: DebtorSummonsProfile = useMemo(
        () =>
            getDebtorSummonsProfile({
                isGovernmentEmployee: isDebtorGovernmentEmployee || isDebtorRetired,
                parsedDebtAmount: principalDebtAmount,
                parsedLawyerFees: parsedLawyerFees,
                claimType: claimType || '',
                isNonFinancialClaim,
            }),
        [
            isDebtorGovernmentEmployee,
            isDebtorRetired,
            principalDebtAmount,
            parsedLawyerFees,
            claimType,
            isNonFinancialClaim,
        ]
    );

    const followupDebtorSummonsProfile = useMemo(() => {
        if (!debtorBrowserTabsMode || !activeWorkspaceDebtorForFollowup) {
            return debtorSummonsProfile;
        }
        const d = activeWorkspaceDebtorForFollowup.d as { occupation?: string };
        const occ = String(d?.occupation || '').toLowerCase();
        const fe =
            occ.includes('موظف') || occ.includes('حكومي') || occ === 'موظف';
        const ret = occ.includes('متقاعد') || occ.includes('تقاعد');
        return getDebtorSummonsProfile({
            isGovernmentEmployee: fe || ret,
            parsedDebtAmount: principalDebtAmount,
            parsedLawyerFees,
            claimType: claimType || '',
            isNonFinancialClaim,
        });
    }, [
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        debtorSummonsProfile,
        principalDebtAmount,
        parsedLawyerFees,
        claimType,
        isNonFinancialClaim,
    ]);

    const followupIsDebtorGovernmentEmployee = useMemo(() => {
        if (!debtorBrowserTabsMode || !activeWorkspaceDebtorForFollowup) {
            return isDebtorGovernmentEmployee;
        }
        if (activeWorkspaceDebtorForFollowup.isPrimary) {
            return isDebtorGovernmentEmployee;
        }
        const occ = String(activeWorkspaceDebtorForFollowup.d.occupation || '').toLowerCase();
        return occ.includes('موظف') || occ.includes('حكومي') || occ === 'موظف';
    }, [debtorBrowserTabsMode, activeWorkspaceDebtorForFollowup, isDebtorGovernmentEmployee]);

    const followupIsDebtorRetired = useMemo(() => {
        if (!debtorBrowserTabsMode || !activeWorkspaceDebtorForFollowup) {
            return isDebtorRetired;
        }
        if (activeWorkspaceDebtorForFollowup.isPrimary) {
            return isDebtorRetired;
        }
        const occ = String(activeWorkspaceDebtorForFollowup.d.occupation || '').toLowerCase();
        return occ.includes('متقاعد') || occ.includes('تقاعد');
    }, [debtorBrowserTabsMode, activeWorkspaceDebtorForFollowup, isDebtorRetired]);

    const showSalaryCaptureForEmployee = useMemo(
        () =>
            shouldShowEmployeeSalaryCapture({
                profile: debtorSummonsProfile,
                claimType: claimType || '',
                parsedLawyerFees: parsedLawyerFees,
            }),
        [debtorSummonsProfile, claimType, parsedLawyerFees]
    );

    return {
        debtorOccupation,
        isDebtorGovernmentEmployee,
        isDebtorFreelancer,
        isDebtorRetired,
        debtorSummonsProfile,
        followupDebtorSummonsProfile,
        followupIsDebtorGovernmentEmployee,
        followupIsDebtorRetired,
        showSalaryCaptureForEmployee,
    };
}
