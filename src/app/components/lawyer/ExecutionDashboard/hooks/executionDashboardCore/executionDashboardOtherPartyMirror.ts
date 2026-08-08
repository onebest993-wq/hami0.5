import type { ExecutionFile } from '@/app/types/execution';
import type { CreditorMirrorWorkflowContext } from '@/app/utils/creditorOtherPartyMirrorVisibility';
import type {
    HiddenFollowupVisibilityInput,
    HiddenGuarantorContext,
} from '@/app/components/lawyer/ExecutionDashboard/components/hiddenFollowupRequestsUtils';
import type { SettlementGuarantorGateSlice } from './executionDashboardFollowupSeizureTabs';
import { requireDecisionsStorageExecutionId } from '@/app/components/lawyer/ExecutionDashboard/utils/requireDecisionsStorageExecutionId';

export type OtherPartyCreditorMirrorProps = {
    executionId: string | undefined;
    claimType: string;
    flags: HiddenFollowupVisibilityInput;
    guarantorCtx: HiddenGuarantorContext;
    activeDebtorKey: string | undefined;
    primaryDebtorKey: string | undefined;
    remainingBalanceIqd: number;
    executionData: ExecutionFile | null | undefined;
    activeDebtorIsDeceased: boolean;
    mirrorWorkflow: CreditorMirrorWorkflowContext;
    debtorAgentManualTrack: true;
};

export type BuildOtherPartyCreditorMirrorPropsInput = {
    isRepresentingDebtor: boolean;
    decisionsStorageExecutionId: string | undefined;
    executionId: string | undefined;
    claimType: string | undefined;
    followupSpecializationEffective: HiddenFollowupVisibilityInput;
    followupSpecialization: Pick<
        HiddenFollowupVisibilityInput,
        'hidePersonalForcedBringActivation' | 'hidePersonalJudgePresentation'
    >;
    showPersonalCoerciveFollowupTab: boolean;
    showGuarantorInSeizureFollowupTab: boolean;
    isPersonalStatusExecutionClaim: boolean;
    isAlimonyClaimType: boolean;
    activeDebtorIsEmployee: boolean;
    custodyRemovalClaimActive: boolean;
    employeeCoerciveDetentionRestricted: boolean;
    remainingBalanceForSeizure: number;
    viewExecutionData: ExecutionFile | null | undefined;
    settlementGuarantorGate: SettlementGuarantorGateSlice;
    activeDebtorIsDeceased: boolean;
    activeDebtorKey: string | undefined;
    primaryDebtorKeyResolved: string | undefined;
    forcedSummoningCanForce: boolean;
    personalTabLockedForEmployee: boolean;
    remaining: number;
};

export function buildOtherPartyCreditorMirrorProps(
    input: BuildOtherPartyCreditorMirrorPropsInput,
): OtherPartyCreditorMirrorProps | null {
    if (!input.isRepresentingDebtor) return null;

    const resolvedExecutionId = requireDecisionsStorageExecutionId({
        decisionsStorageExecutionId: input.decisionsStorageExecutionId,
        executionId: input.executionId,
        executionData: input.executionData as Record<string, unknown> | null,
    });

    return {
        executionId: resolvedExecutionId,
        claimType: String(input.claimType || '').trim(),
        flags: {
            ...input.followupSpecializationEffective,
            showPersonalCoerciveFollowupTab: input.showPersonalCoerciveFollowupTab,
            showGuarantorInSeizureTab: input.showGuarantorInSeizureFollowupTab,
            isPersonalStatusExecutionClaim: input.isPersonalStatusExecutionClaim,
            isAlimonyClaim: input.isAlimonyClaimType,
            activeDebtorIsEmployee: input.activeDebtorIsEmployee,
            isCustodyRemovalClaim: input.custodyRemovalClaimActive,
            showHiddenExecutiveDossierPresentation:
                !input.followupSpecializationEffective.hidePersonalJudgePresentation &&
                !input.employeeCoerciveDetentionRestricted &&
                input.remainingBalanceForSeizure > 0,
        },
        guarantorCtx: {
            executionData: input.viewExecutionData,
            settlementBreachTriggeredAt: input.settlementGuarantorGate.settlementBreachTriggeredAt,
            ledgerPendingSettlement: input.settlementGuarantorGate.pendingSettlement,
            financialCenterTotalIqd: input.remainingBalanceForSeizure,
            activeDebtorIsDeceased: input.activeDebtorIsDeceased,
            activeDebtorIsEmployee: input.activeDebtorIsEmployee,
        },
        activeDebtorKey: input.activeDebtorKey,
        primaryDebtorKey: input.primaryDebtorKeyResolved,
        remainingBalanceIqd: input.remainingBalanceForSeizure,
        executionData: input.viewExecutionData,
        activeDebtorIsDeceased: input.activeDebtorIsDeceased,
        mirrorWorkflow: {
            executionId: String(resolvedExecutionId ?? '').trim() || undefined,
            executionData: input.viewExecutionData,
            activeDebtorKey: input.activeDebtorKey,
            primaryDebtorKey: input.primaryDebtorKeyResolved,
            forcedSummoningCanForce: input.forcedSummoningCanForce,
            hidePersonalForcedBringActivation:
                input.followupSpecialization.hidePersonalForcedBringActivation,
            hideDossierJudgePresentation: input.followupSpecialization.hidePersonalJudgePresentation,
            personalTabLockedForEmployee: input.personalTabLockedForEmployee,
            showPersonalCoerciveFollowupTab: input.showPersonalCoerciveFollowupTab,
            debtRemainingIqd: input.remaining,
            activeDebtorIsEmployee: input.activeDebtorIsEmployee,
            activeDebtorIsDeceased: input.activeDebtorIsDeceased,
        },
        debtorAgentManualTrack: true,
    };
}
