import { useMemo } from 'react';
import {
    buildOtherPartyCreditorMirrorProps,
    type BuildOtherPartyCreditorMirrorPropsInput,
    type OtherPartyCreditorMirrorProps,
} from './executionDashboardOtherPartyMirror';

export type UseExecutionDashboardOtherPartyMirrorParams = BuildOtherPartyCreditorMirrorPropsInput;

export function useExecutionDashboardOtherPartyMirror(
    params: UseExecutionDashboardOtherPartyMirrorParams,
): OtherPartyCreditorMirrorProps | null {
    const {
        isRepresentingDebtor,
        decisionsStorageExecutionId,
        executionId,
        claimType,
        followupSpecializationEffective,
        followupSpecialization,
        showPersonalCoerciveFollowupTab,
        showGuarantorInSeizureFollowupTab,
        isPersonalStatusExecutionClaim,
        isAlimonyClaimType,
        activeDebtorIsEmployee,
        custodyRemovalClaimActive,
        employeeCoerciveDetentionRestricted,
        remainingBalanceForSeizure,
        viewExecutionData,
        settlementGuarantorGate,
        activeDebtorIsDeceased,
        activeDebtorKey,
        primaryDebtorKeyResolved,
        forcedSummoningCanForce,
        personalTabLockedForEmployee,
        remaining,
    } = params;

    return useMemo(
        () => buildOtherPartyCreditorMirrorProps(params),
        [
            isRepresentingDebtor,
            decisionsStorageExecutionId,
            executionId,
            claimType,
            followupSpecializationEffective,
            followupSpecialization.hidePersonalForcedBringActivation,
            followupSpecialization.hidePersonalJudgePresentation,
            showPersonalCoerciveFollowupTab,
            showGuarantorInSeizureFollowupTab,
            isPersonalStatusExecutionClaim,
            isAlimonyClaimType,
            activeDebtorIsEmployee,
            custodyRemovalClaimActive,
            employeeCoerciveDetentionRestricted,
            remainingBalanceForSeizure,
            viewExecutionData,
            settlementGuarantorGate.settlementBreachTriggeredAt,
            settlementGuarantorGate.pendingSettlement,
            activeDebtorIsDeceased,
            activeDebtorKey,
            primaryDebtorKeyResolved,
            forcedSummoningCanForce,
            personalTabLockedForEmployee,
            remaining,
        ],
    );
}
