/** Earner-gated followup tabs + merged claim ledger + financialStatus after grace master */
import { useMemo } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import {
    buildRestrictedFollowupTabIds,
} from './executionDashboardFollowupSeizureTabs';
import {
    buildFollowupModalTabsFromFlags,
    buildFollowupSectionTabOrderFromFlags,
} from './buildFollowupModalTabsFromFlags';
import { useExecutionDashboardFollowupSeizureTabs } from './useExecutionDashboardFollowupSeizureTabs';
import type { useExecutionDashboardCoreClaimFinancialLedgerPipeline } from './useExecutionDashboardCoreClaimFinancialLedgerPipeline';
import type { useExecutionDashboardCoreGraceMasterEvictionPipeline } from './useExecutionDashboardCoreGraceMasterEvictionPipeline';
import type { useExecutionDashboardCoreFollowupDebtorPipeline } from './useExecutionDashboardCoreFollowupDebtorPipeline';
import type { ExecutionDashboardCoreWorkspacePipelineValue } from './executionDashboardCoreWorkspacePipelineTypes';

type ClaimFinancialLedger = ReturnType<typeof useExecutionDashboardCoreClaimFinancialLedgerPipeline>;
type GraceMasterPipeline = ReturnType<typeof useExecutionDashboardCoreGraceMasterEvictionPipeline>;
type FollowupDebtor = ReturnType<typeof useExecutionDashboardCoreFollowupDebtorPipeline>;

export type ExecutionDashboardCoreClaimGraceEarnerFollowupParams = {
    claimFinancialLedger: ClaimFinancialLedger;
    graceMasterPipeline: GraceMasterPipeline;
    workspacePipeline: Pick<
        ExecutionDashboardCoreWorkspacePipelineValue,
        'followupOrchestrator' | 'showUnifiedExecutionModal'
    >;
    followupSpecializationResolved: NonNullable<FollowupDebtor['followupSpecialization']>;
    followupSpecializationEffectiveResolved: NonNullable<
        FollowupDebtor['followupSpecializationEffective']
    >;
    followupModalSpecializationEffective: FollowupDebtor['followupModalSpecializationEffective'];
    followupTabsRestricted: FollowupDebtor['followupTabsRestricted'];
    hideCoerciveTabsForDebtorAgent: FollowupDebtor['hideCoerciveTabsForDebtorAgent'];
    activeDebtorIsDeceased: FollowupDebtor['activeDebtorIsDeceased'];
    activeDebtorIsEmployee: FollowupDebtor['activeDebtorIsEmployee'];
    viewExecutionData: ExecutionFile | null | undefined;
    remainingBalanceForSeizure: ClaimFinancialLedger['remainingBalanceForSeizure'];
    settlementGuarantorGate: ClaimFinancialLedger['settlementGuarantorGate'];
    seizureMatrix: ClaimFinancialLedger['seizureMatrix'];
    isSolidaryLiability: FollowupDebtor['isSolidaryLiability'];
    allDebtorsUnified: FollowupDebtor['allDebtorsUnified'];
    modalPersonalTabLockedForEmployee: FollowupDebtor['modalPersonalTabLockedForEmployee'];
    modalShowEmployeeAssignmentCoerciveBlock: FollowupDebtor['modalShowEmployeeAssignmentCoerciveBlock'];
    showToast: (
        message: string,
        type?: 'success' | 'error' | 'warning' | 'info',
        _legacyOptions?: unknown,
    ) => void;
    gracePeriodEnded: boolean;
    remaining: GraceMasterPipeline['remaining'];
    daysSinceNoticeCalculated: number;
};

export function useExecutionDashboardCoreClaimGraceEarnerFollowup(
    p: ExecutionDashboardCoreClaimGraceEarnerFollowupParams,
) {
    const {
        claimFinancialLedger,
        graceMasterPipeline,
        workspacePipeline,
        followupSpecializationResolved,
        followupSpecializationEffectiveResolved,
        followupModalSpecializationEffective,
        followupTabsRestricted,
        hideCoerciveTabsForDebtorAgent,
        activeDebtorIsDeceased,
        activeDebtorIsEmployee,
        viewExecutionData,
        remainingBalanceForSeizure,
        settlementGuarantorGate,
        seizureMatrix,
        isSolidaryLiability,
        allDebtorsUnified,
        modalPersonalTabLockedForEmployee,
        modalShowEmployeeAssignmentCoerciveBlock,
        showToast,
        gracePeriodEnded,
        remaining,
        daysSinceNoticeCalculated,
    } = p;

    const {
        followupSpecializationWithEarnerGate,
        followupModalSpecializationEffectiveWithEarnerGate,
    } = graceMasterPipeline;

    const { followupOrchestrator, showUnifiedExecutionModal } = workspacePipeline;

    const followupSpecializationWithEarnerGateResolved =
        followupSpecializationWithEarnerGate ?? followupSpecializationResolved;

    const followupModalSpecializationEffectiveWithEarnerGateResolved =
        followupModalSpecializationEffectiveWithEarnerGate ??
        followupModalSpecializationEffective ??
        followupSpecializationEffectiveResolved;

    const modalShowPersonalCoerciveFollowupTabEarner = useMemo(
        () =>
            !followupModalSpecializationEffectiveWithEarnerGateResolved.hidePersonalCoerciveFollowupTab ||
            modalShowEmployeeAssignmentCoerciveBlock,
        [
            followupModalSpecializationEffectiveWithEarnerGateResolved.hidePersonalCoerciveFollowupTab,
            modalShowEmployeeAssignmentCoerciveBlock,
        ],
    );

    const showPersonalCoerciveFollowupTabEarner = useMemo(
        () => !followupSpecializationWithEarnerGateResolved.hidePersonalCoerciveFollowupTab,
        [followupSpecializationWithEarnerGateResolved.hidePersonalCoerciveFollowupTab],
    );

    const restrictedFollowupTabIdsEarner = useMemo(
        () =>
            buildRestrictedFollowupTabIds({
                specialization: followupSpecializationWithEarnerGateResolved,
                showPersonalCoerciveFollowupTab: modalShowPersonalCoerciveFollowupTabEarner,
            }),
        [
            followupSpecializationWithEarnerGateResolved.hideFollowupCoerciveTab,
            followupSpecializationWithEarnerGateResolved.hideFollowupSeizureRequestsTab,
            followupSpecializationWithEarnerGateResolved.hidePersonalCoerciveFollowupTab,
            modalShowPersonalCoerciveFollowupTabEarner,
        ],
    );

    const earnerGatedFollowupModalTabs = useMemo(
        () =>
            buildFollowupModalTabsFromFlags({
                specialization: followupModalSpecializationEffectiveWithEarnerGateResolved,
                showPersonalCoerciveFollowupTab: modalShowPersonalCoerciveFollowupTabEarner,
                personalTabLockedForEmployee: modalPersonalTabLockedForEmployee,
                followupTabsRestricted,
            }),
        [
            followupModalSpecializationEffectiveWithEarnerGateResolved,
            modalShowPersonalCoerciveFollowupTabEarner,
            modalPersonalTabLockedForEmployee,
            followupTabsRestricted,
        ],
    );

    const earnerGatedFollowupSectionTabOrder = useMemo(
        () =>
            buildFollowupSectionTabOrderFromFlags({
                showPersonalCoerciveFollowupTab: showPersonalCoerciveFollowupTabEarner,
                specialization: followupSpecializationWithEarnerGateResolved,
                followupTabsRestricted,
            }),
        [
            showPersonalCoerciveFollowupTabEarner,
            followupSpecializationWithEarnerGateResolved,
            followupTabsRestricted,
        ],
    );

    const earnerFollowupSeizureTabs = useExecutionDashboardFollowupSeizureTabs({
        activeDebtorIsDeceased,
        activeDebtorIsEmployee,
        viewExecutionData,
        followupSpecialization: followupSpecializationWithEarnerGateResolved,
        remainingBalanceForSeizure,
        settlementGuarantorGate,
        followupSectionTabOrder: earnerGatedFollowupSectionTabOrder,
        followupModalTabs: earnerGatedFollowupModalTabs,
        seizureMatrix,
        followupTabsRestricted,
        restrictedFollowupTabIds: restrictedFollowupTabIdsEarner,
        openSeizureRequestsTabRef: followupOrchestrator.openSeizureRequestsTabRef,
        setUnifiedModalTab: followupOrchestrator.setUnifiedModalTab,
        showToast: showToast as (message: string, type: 'info' | 'success' | 'error' | 'warning') => void,
        showUnifiedExecutionModal,
        unifiedModalTab: followupOrchestrator.unifiedModalTab,
        hideFollowupCoerciveTab: followupSpecializationWithEarnerGateResolved.hideFollowupCoerciveTab,
        hideCoerciveTabsForDebtorAgent,
        showPersonalCoerciveFollowupTab: showPersonalCoerciveFollowupTabEarner,
        setShowSolidaryCoerciveTargetModal: followupOrchestrator.setShowSolidaryCoerciveTargetModal,
        setSolidaryCoerciveActionPending: followupOrchestrator.setSolidaryCoerciveActionPending,
        followupModalChipTablistRef: followupOrchestrator.followupModalChipTablistRef,
        followupModalDebtorTabsRef: followupOrchestrator.followupModalDebtorTabsRef,
        isSolidaryLiability,
        solidaryDebtorCount: allDebtorsUnified.length,
    });

    const claimFinancialLedgerMerged = useMemo(
        () => ({
            ...claimFinancialLedger,
            showGuarantorInSeizureFollowupTab: earnerFollowupSeizureTabs.showGuarantorInSeizureFollowupTab,
            effectiveFollowupSectionTabOrder: earnerFollowupSeizureTabs.effectiveFollowupSectionTabOrder,
            effectiveFollowupModalTabs: earnerFollowupSeizureTabs.effectiveFollowupModalTabs,
            openSeizureRequestsTab: earnerFollowupSeizureTabs.openSeizureRequestsTab,
            followupSeizureTabs: earnerFollowupSeizureTabs,
            showPersonalCoerciveFollowupTab: showPersonalCoerciveFollowupTabEarner,
        }),
        [claimFinancialLedger, earnerFollowupSeizureTabs, showPersonalCoerciveFollowupTabEarner],
    );

    const financialStatus = useMemo(() => {
        if (remaining <= 0) {
            return { label: 'منتظم', color: 'emerald', pulse: false };
        }
        if (!gracePeriodEnded && daysSinceNoticeCalculated <= 7) {
            return { label: 'فترة الإمهال القانوني', color: 'amber', pulse: false };
        }
        if (gracePeriodEnded || daysSinceNoticeCalculated > 7) {
            return { label: 'جاهز للتنفيذ الجبري', color: 'rose', pulse: true };
        }
        return { label: 'إخلال - جاهز للتنفيذ', color: 'rose', pulse: true };
    }, [remaining, gracePeriodEnded, daysSinceNoticeCalculated]);

    return {
        claimFinancialLedgerMerged,
        financialStatus,
    };
}
