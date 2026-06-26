import { useCallback, useMemo, type MutableRefObject, type RefObject } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import type { FollowupUnifiedModalTab } from '../../followupModalTabTypes';
import { useFollowupModalTabGuards } from './useFollowupModalTabGuards';
import {
    canOpenSeizureRequestsTab,
    computeShowGuarantorInSeizureFollowupTab,
    filterSeizureFromFollowupModalTabs,
    filterSeizureFromFollowupSectionTabOrder,
    resolveOpenSeizureRequestsTabBlockedMessage,
    type FollowupSeizureSpecialization,
    type SeizureMatrixSeizureTabSlice,
    type SettlementGuarantorGateSlice,
} from './executionDashboardFollowupSeizureTabs';

export type FollowupModalTabEntry = {
    id:
        | 'personal'
        | 'coercive'
        | 'seizure_requests'
        | 'correspondences'
        | 'admin'
        | 'dossier_controls'
        | 'other_party';
    label: string;
};

export type UseExecutionDashboardFollowupSeizureTabsParams = {
    activeDebtorIsDeceased: boolean;
    activeDebtorIsEmployee: boolean;
    viewExecutionData: ExecutionFile | null | undefined;
    followupSpecialization: FollowupSeizureSpecialization;
    remainingBalanceForSeizure: number;
    settlementGuarantorGate: SettlementGuarantorGateSlice;
    followupSectionTabOrder: readonly string[];
    followupModalTabs: readonly FollowupModalTabEntry[];
    seizureMatrix: SeizureMatrixSeizureTabSlice;
    followupTabsRestricted: boolean;
    restrictedFollowupTabIds: ReadonlySet<string>;
    openSeizureRequestsTabRef: MutableRefObject<() => void>;
    setUnifiedModalTab: Dispatch<SetStateAction<FollowupUnifiedModalTab>>;
    showToast: (message: string, type: 'info' | 'success' | 'error' | 'warning') => void;
    showUnifiedExecutionModal: boolean;
    unifiedModalTab: FollowupUnifiedModalTab;
    hideFollowupCoerciveTab: boolean;
    hideCoerciveTabsForDebtorAgent: boolean;
    showPersonalCoerciveFollowupTab: boolean;
    setShowSolidaryCoerciveTargetModal: (open: boolean) => void;
    setSolidaryCoerciveActionPending: (action: string | null) => void;
    followupModalChipTablistRef: RefObject<HTMLDivElement | null>;
    followupModalDebtorTabsRef: RefObject<HTMLDivElement | null>;
    isSolidaryLiability: boolean;
    solidaryDebtorCount: number;
};

export function useExecutionDashboardFollowupSeizureTabs({
    activeDebtorIsDeceased,
    activeDebtorIsEmployee,
    viewExecutionData,
    followupSpecialization,
    remainingBalanceForSeizure,
    settlementGuarantorGate,
    followupSectionTabOrder,
    followupModalTabs,
    seizureMatrix,
    followupTabsRestricted,
    restrictedFollowupTabIds,
    openSeizureRequestsTabRef,
    setUnifiedModalTab,
    showToast,
    showUnifiedExecutionModal,
    unifiedModalTab,
    hideFollowupCoerciveTab,
    hideCoerciveTabsForDebtorAgent,
    showPersonalCoerciveFollowupTab,
    setShowSolidaryCoerciveTargetModal,
    setSolidaryCoerciveActionPending,
    followupModalChipTablistRef,
    followupModalDebtorTabsRef,
    isSolidaryLiability,
    solidaryDebtorCount,
}: UseExecutionDashboardFollowupSeizureTabsParams) {
    const showGuarantorInSeizureFollowupTab = useMemo(
        () =>
            computeShowGuarantorInSeizureFollowupTab({
                activeDebtorIsDeceased,
                activeDebtorIsEmployee,
                viewExecutionData,
                followupSpecialization,
                remainingBalanceForSeizure,
                settlementGuarantorGate,
            }),
        [
            activeDebtorIsDeceased,
            activeDebtorIsEmployee,
            followupSpecialization.hideAllGuarantorPresence,
            followupSpecialization.isFinancialDebtCollection,
            followupSpecialization.showFinancialGuarantorRequestOnly,
            remainingBalanceForSeizure,
            settlementGuarantorGate.pendingSettlement,
            settlementGuarantorGate.settlementBreachTriggeredAt,
            viewExecutionData,
        ],
    );

    const effectiveFollowupSectionTabOrder = useMemo(
        () =>
            filterSeizureFromFollowupSectionTabOrder(
                followupSectionTabOrder,
                seizureMatrix.hideSeizureTab,
                followupSpecialization.hideFollowupSeizureRequestsTab,
            ),
        [
            followupSectionTabOrder,
            seizureMatrix.hideSeizureTab,
            followupSpecialization.hideFollowupSeizureRequestsTab,
        ],
    );

    const effectiveFollowupModalTabs = useMemo(
        () =>
            filterSeizureFromFollowupModalTabs(
                followupModalTabs,
                seizureMatrix.hideSeizureTab,
                followupSpecialization.hideFollowupSeizureRequestsTab,
                followupTabsRestricted,
                restrictedFollowupTabIds,
            ),
        [
            followupModalTabs,
            seizureMatrix.hideSeizureTab,
            followupSpecialization.hideFollowupSeizureRequestsTab,
            followupTabsRestricted,
            restrictedFollowupTabIds,
        ],
    );

    const openSeizureRequestsTab = useCallback(() => {
        if (
            !canOpenSeizureRequestsTab(seizureMatrix, followupSpecialization.hideFollowupSeizureRequestsTab)
        ) {
            showToast(
                resolveOpenSeizureRequestsTabBlockedMessage(
                    followupSpecialization.hideFollowupSeizureRequestsTab,
                    seizureMatrix,
                ),
                'info',
            );
            return;
        }
        setUnifiedModalTab('seizure_requests');
    }, [
        seizureMatrix,
        followupSpecialization.hideFollowupSeizureRequestsTab,
        showToast,
        setUnifiedModalTab,
    ]);

    openSeizureRequestsTabRef.current = openSeizureRequestsTab;

    useFollowupModalTabGuards({
        showUnifiedExecutionModal,
        unifiedModalTab,
        setUnifiedModalTab,
        effectiveFollowupSectionTabOrder,
        seizureMatrix,
        hideFollowupCoerciveTab,
        hideFollowupSeizureRequestsTab: followupSpecialization.hideFollowupSeizureRequestsTab,
        followupTabsRestricted,
        restrictedFollowupTabIds,
        hideCoerciveTabsForDebtorAgent,
        showPersonalCoerciveFollowupTab,
        setShowSolidaryCoerciveTargetModal,
        setSolidaryCoerciveActionPending,
        followupModalChipTablistRef,
        followupModalDebtorTabsRef,
        isSolidaryLiability,
        solidaryDebtorCount,
    });

    return {
        showGuarantorInSeizureFollowupTab,
        effectiveFollowupSectionTabOrder,
        effectiveFollowupModalTabs,
        openSeizureRequestsTab,
    };
}
