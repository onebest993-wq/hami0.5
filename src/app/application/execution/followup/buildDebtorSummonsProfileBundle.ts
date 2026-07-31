import {
    getDebtorSummonsProfile,
    shouldShowEmployeeSalaryCapture,
    type DebtorSummonsProfile,
} from '@/app/utils/debtorSummonsProfile';
import {
    inferDebtorEmploymentFlags,
    isDebtorRowEmployee,
    type DebtorEmploymentLike,
} from '@/app/domain/execution/followup/debtorEmployment';

type FollowupDebtorEntry = {
    d: DebtorEmploymentLike;
    isPrimary?: boolean;
} | null;

export type BuildDebtorSummonsProfileBundleInput = {
    debtors: DebtorEmploymentLike[];
    principalDebtAmount: number;
    parsedLawyerFees: number;
    claimType: string | undefined;
    isNonFinancialClaim: boolean;
    debtorBrowserTabsMode: boolean;
    activeWorkspaceDebtorForFollowup: FollowupDebtorEntry;
};

export function buildDebtorSummonsProfileBundle(input: BuildDebtorSummonsProfileBundleInput) {
    const {
        debtors,
        principalDebtAmount,
        parsedLawyerFees,
        claimType,
        isNonFinancialClaim,
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
    } = input;
    const primaryFlags = inferDebtorEmploymentFlags(debtors[0]);
    const debtorOccupation = primaryFlags.occupation;
    const isDebtorGovernmentEmployee = primaryFlags.isGovernmentEmployee;
    const isDebtorFreelancer = primaryFlags.isFreelancer;
    const isDebtorRetired = primaryFlags.isRetired;

    const debtorSummonsProfile: DebtorSummonsProfile = getDebtorSummonsProfile({
        isGovernmentEmployee: isDebtorGovernmentEmployee || isDebtorRetired,
        parsedDebtAmount: principalDebtAmount,
        parsedLawyerFees,
        claimType: claimType || '',
        isNonFinancialClaim,
    });

    let followupDebtorSummonsProfile = debtorSummonsProfile;
    if (debtorBrowserTabsMode && activeWorkspaceDebtorForFollowup) {
        const followupFlags = inferDebtorEmploymentFlags(activeWorkspaceDebtorForFollowup.d);
        followupDebtorSummonsProfile = getDebtorSummonsProfile({
            isGovernmentEmployee: followupFlags.isGovernmentEmployee || followupFlags.isRetired,
            parsedDebtAmount: principalDebtAmount,
            parsedLawyerFees,
            claimType: claimType || '',
            isNonFinancialClaim,
        });
    }

    const followupIsDebtorGovernmentEmployee =
        debtorBrowserTabsMode && activeWorkspaceDebtorForFollowup && !activeWorkspaceDebtorForFollowup.isPrimary
            ? isDebtorRowEmployee(activeWorkspaceDebtorForFollowup.d)
            : isDebtorGovernmentEmployee;

    const followupIsDebtorRetired =
        debtorBrowserTabsMode && activeWorkspaceDebtorForFollowup && !activeWorkspaceDebtorForFollowup.isPrimary
            ? inferDebtorEmploymentFlags(activeWorkspaceDebtorForFollowup.d).isRetired
            : isDebtorRetired;

    const showSalaryCaptureForEmployee = shouldShowEmployeeSalaryCapture({
        profile: debtorSummonsProfile,
        claimType: claimType || '',
        parsedLawyerFees,
    });

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
