import { useMemo, useState } from 'react';
import type { MutableRefObject } from 'react';
import { getPersonalCoerciveSubtypeOutcome } from '@/app/utils/executorDecisionReadQueries';
import { useToastSystem } from '../useToastSystem';
import { useExecutionDecisionsOrchestrator } from '../../orchestrators/useExecutionDecisionsOrchestrator';
import { useExecutionFinancialOrchestrator } from '../../orchestrators/useExecutionFinancialOrchestrator';
import { useThirdPartySeizuresUi } from '../useThirdPartySeizuresUi';
import { useExecutionDashboardOpenDecisionsModalBridge } from './useExecutionDashboardOpenDecisionsModalBridge';
import { useSeizureApprovalToast } from '../useSeizureApprovalToast';
import { useExecutionDashboardPerformanceMonitor } from './useExecutionDashboardRuntimeSyncEffects';
import {
    useExecutionDecisionOutcomeToastBridge,
    useExecutionToastBridge,
} from '../useExecutionDashboardWindowBridge';
import type { ExecutionDashboardCoreWorkspacePipelineInput } from './executionDashboardCoreWorkspacePipelineInput';

type FollowupBridge = {
    showUnifiedExecutionModalRef: MutableRefObject<boolean>;
    setShowUnifiedExecutionModal: (show: boolean) => void;
};

type DecisionsOrchestratorBridge = {
    decisionsReloadEpoch: number;
    setDecisionsReloadEpoch: (value: number) => void;
    decisionsModalBootHubTab: string;
    setDecisionsModalBootHubTab: (value: string) => void;
    decisionsModalBootListTab: string;
    setDecisionsModalBootListTab: (value: string) => void;
    decisionsModalScrollToDecisionId: string | null;
    setDecisionsModalScrollToDecisionId: (value: string | null) => void;
    appealsModalScrollToDecisionId: string | null;
    setAppealsModalScrollToDecisionId: (value: string | null) => void;
    clearDecisionsModalBootState: () => void;
    openDecisionsModalWithBoot: (boot?: { tab?: string; decisionId?: string | null }) => void;
};

export function useExecutionDashboardWorkspaceControlCenterCluster(input: {
    p: ExecutionDashboardCoreWorkspacePipelineInput;
    followupOrchestrator: FollowupBridge;
    setShowUnifiedSummonsModal: (show: boolean) => void;
}) {
    const { p, followupOrchestrator, setShowUnifiedSummonsModal } = input;

    const [isPaused, setIsPaused] = useState(p.executionData?.isPaused ?? false);
    const [pauseReason, setPauseReason] = useState(p.executionData?.pauseReason ?? '');
    const [executionFeeAdded, setExecutionFeeAdded] = useState(
        p.executionData?.executionFeeAdded ?? false,
    );

    const {
        toastVisible,
        toastMessage,
        toastType,
        toastEpoch,
        showToast,
        hideToast,
        showToastRef,
    } = useToastSystem(p.executionData?.id, p.executionId);

    useExecutionDecisionOutcomeToastBridge({
        executionDataId: p.executionData?.id,
        executionId: p.executionId,
        decisionsStorageExecutionId: p.decisionsStorageExecutionId,
        showUnifiedExecutionModalRef: followupOrchestrator.showUnifiedExecutionModalRef,
        showToastRef,
    });
    useExecutionToastBridge(showToastRef);

    const decisionsOrchestrator = useExecutionDecisionsOrchestrator({
        showDecisionsModal: p.showDecisionsModal,
        setShowDecisionsModal: p.setShowDecisionsModal,
    }) as DecisionsOrchestratorBridge;
    const {
        decisionsReloadEpoch,
        setDecisionsReloadEpoch,
        decisionsModalBootHubTab,
        setDecisionsModalBootHubTab,
        decisionsModalBootListTab,
        setDecisionsModalBootListTab,
        decisionsModalScrollToDecisionId,
        setDecisionsModalScrollToDecisionId,
        appealsModalScrollToDecisionId,
        setAppealsModalScrollToDecisionId,
        clearDecisionsModalBootState,
        openDecisionsModalWithBoot,
    } = decisionsOrchestrator;

    const forcedBringDecisionState = useMemo(
        () =>
            getPersonalCoerciveSubtypeOutcome(
                p.executionData?.id ?? p.executionId,
                'forced_bring_in',
            ),
        [p.executionData?.id, p.executionId, decisionsReloadEpoch],
    );

    const employeeForcedBringAwaitingPersonalOutcome = useMemo(
        () =>
            Boolean(
                forcedBringDecisionState.approved &&
                    p.executionData?.forced_bring_in_personal_outcome !== 'brought' &&
                    p.executionData?.forced_bring_in_personal_outcome !== 'absconded',
            ),
        [forcedBringDecisionState.approved, p.executionData?.forced_bring_in_personal_outcome],
    );

    const [executionFeeInjected, setExecutionFeeInjected] = useState(
        p.executionData?.executionFeeInjected || false,
    );

    const financialOrchestrator = useExecutionFinancialOrchestrator({
        setShowUnifiedExecutionModal: followupOrchestrator.setShowUnifiedExecutionModal,
    });
    const {
        isFinancialCenterExpanded,
        setIsFinancialCenterExpanded,
        activeFinancialTab,
        setActiveFinancialTab,
        showExecutionFinancialHub,
        setShowExecutionFinancialHub,
        financialHubAutoOpenMode,
        setFinancialHubAutoOpenMode,
        financialHubSeizedMovableId,
        setFinancialHubSeizedMovableId,
        financialHubSeizedPropertyId,
        setFinancialHubSeizedPropertyId,
        openFinancialHubLedger,
    } = financialOrchestrator;

    useExecutionDashboardOpenDecisionsModalBridge({
        executionDataId: p.executionData?.id,
        executionId: p.executionId,
        decisionsStorageExecutionId: p.decisionsStorageExecutionId,
        executionData: p.executionData,
        setShowExecutionFinancialHub,
        setShowUnifiedExecutionModal: followupOrchestrator.setShowUnifiedExecutionModal,
        setShowUnifiedSummonsModal,
        setShowNotesModal: p.setShowNotesModal,
        setShowDocumentsModal: p.setShowDocumentsModal,
        setShowAppointmentModal: p.setShowAppointmentModal,
        setShowTimelineModal: p.setShowTimelineModal,
        setShowNotificationModal: p.setShowNotificationModal,
        openDecisionsModalWithBoot,
    });

    const { thirdPartySeizuresUi, setThirdPartySeizuresUi, applyThirdPartySeizuresFromPatch } =
        useThirdPartySeizuresUi(p.executionData);

    useSeizureApprovalToast({
        executionDataId: p.executionData?.id,
        executionId: p.executionId,
        showToast,
    });

    useExecutionDashboardPerformanceMonitor();

    return {
        isPaused,
        setIsPaused,
        pauseReason,
        setPauseReason,
        executionFeeAdded,
        toastVisible,
        toastMessage,
        toastType,
        toastEpoch,
        showToast,
        hideToast,
        showToastRef,
        decisionsOrchestrator,
        decisionsReloadEpoch,
        setDecisionsReloadEpoch,
        decisionsModalBootHubTab,
        setDecisionsModalBootHubTab,
        decisionsModalBootListTab,
        setDecisionsModalBootListTab,
        decisionsModalScrollToDecisionId,
        setDecisionsModalScrollToDecisionId,
        appealsModalScrollToDecisionId,
        setAppealsModalScrollToDecisionId,
        clearDecisionsModalBootState,
        openDecisionsModalWithBoot,
        forcedBringDecisionState,
        employeeForcedBringAwaitingPersonalOutcome,
        executionFeeInjected,
        setExecutionFeeInjected,
        financialOrchestrator,
        isFinancialCenterExpanded,
        setIsFinancialCenterExpanded,
        activeFinancialTab,
        setActiveFinancialTab,
        showExecutionFinancialHub,
        setShowExecutionFinancialHub,
        financialHubAutoOpenMode,
        setFinancialHubAutoOpenMode,
        financialHubSeizedMovableId,
        setFinancialHubSeizedMovableId,
        financialHubSeizedPropertyId,
        setFinancialHubSeizedPropertyId,
        openFinancialHubLedger,
        thirdPartySeizuresUi,
        setThirdPartySeizuresUi,
        applyThirdPartySeizuresFromPatch,
    };
}
