import type { MutableRefObject } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import {
    useExecutionDashboardExecutionFeeExemptionToast,
    useExecutionDashboardFieldVisitScheduledListener,
    useExecutionDashboardMaritalFurnitureFinancialSync,
} from './useExecutionDashboardRuntimeSyncEffects';
import { useExecutionDashboardStatuteWarning } from './useExecutionDashboardStatuteWarning';
import { useExecutionDashboardTimelineDedupeSync } from './useExecutionDashboardTimelineAndGraceSync';
import {
    useExecutionDashboardGuarantorDecisionSync,
    useExecutionDashboardDeceasedDebtorCoerciveReset,
    useExecutionDashboardSeizureRequestCreatedListener,
    useExecutionDashboardWindowEventListeners,
} from './useExecutionDashboardDecisionAndEventSync';
import type { ExecutorApprovalActions } from '../../executionDashboardRuntimeChunkScope';

type StatuteStatus = Parameters<typeof useExecutionDashboardStatuteWarning>[0];
type SetShowStatuteWarning = Parameters<typeof useExecutionDashboardStatuteWarning>[2];
type FieldVisitListenerInput = Parameters<typeof useExecutionDashboardFieldVisitScheduledListener>[0];
type TimelineDedupeSyncInput = Parameters<typeof useExecutionDashboardTimelineDedupeSync>[0];
type SeizureRequestCreatedListenerInput =
    Parameters<typeof useExecutionDashboardSeizureRequestCreatedListener>[0];
type DeceasedDebtorCoerciveResetInput =
    Parameters<typeof useExecutionDashboardDeceasedDebtorCoerciveReset>[0];
type WindowEventListenersInput = Parameters<typeof useExecutionDashboardWindowEventListeners>[0];

export type ExecutionDashboardPersistEffectsClusterInput = {
    debtorNotificationDate: string | null;
    daysSinceNoticeCalculated: number;
    remaining: number;
    executionFeeInjected: boolean;
    showToast: (message: string, type?: string) => void;
    statuteStatus: StatuteStatus;
    showStatuteWarning: boolean;
    setShowStatuteWarning: SetShowStatuteWarning;
    isAlimonyClaim: boolean;
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    decisionsStorageExecutionId: string;
    executorApprovalActions: ExecutorApprovalActions;
    isMaritalFurnitureClaim: boolean;
    maritalFurnitureItemsForFollowup: MaritalFurnitureItem[];
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    timelineEvents: TimelineEvent[];
    activeSubFileId: string | null;
    parentDossierId: string | null;
    setTimelineEvents: TimelineDedupeSyncInput['setTimelineEvents'];
    seizureDraftsByDecisionIdRef: SeizureRequestCreatedListenerInput['seizureDraftsByDecisionIdRef'];
    seizedAssetsSnapshotRef: SeizureRequestCreatedListenerInput['seizedAssetsSnapshotRef'];
    setSeizureDraftsByDecisionId: SeizureRequestCreatedListenerInput['setSeizureDraftsByDecisionId'];
    nextTimelineId: () => string;
    decisionsReloadEpoch: number;
    activeDebtorIsDeceased: boolean;
    activeCoerciveActions: DeceasedDebtorCoerciveResetInput['activeCoerciveActions'];
    debtorArrested: boolean;
    investigationPathDebtorPresent: boolean;
    setActiveCoerciveActions: DeceasedDebtorCoerciveResetInput['setActiveCoerciveActions'];
    setDebtorArrested: DeceasedDebtorCoerciveResetInput['setDebtorArrested'];
    setInvestigationPathDebtorPresent:
        DeceasedDebtorCoerciveResetInput['setInvestigationPathDebtorPresent'];
    setShowDecisionsModal: (open: boolean) => void;
    openExecutionSeizuresTab: () => void;
    pushTimelineEventRef: WindowEventListenersInput['pushTimelineEventRef'];
    showDecisionsModal: boolean;
    showHeirsNotificationModal: boolean;
    setShowHeirsNotificationModal: (open: boolean) => void;
};

export function useExecutionDashboardPersistEffectsCluster(
    input: ExecutionDashboardPersistEffectsClusterInput,
) {
    useExecutionDashboardExecutionFeeExemptionToast({
        debtorNotificationDate: input.debtorNotificationDate,
        daysSinceNoticeCalculated: input.daysSinceNoticeCalculated,
        remaining: input.remaining,
        executionFeeInjected: input.executionFeeInjected,
        showToast: input.showToast,
    });

    useExecutionDashboardStatuteWarning(
        input.statuteStatus,
        input.showStatuteWarning,
        input.setShowStatuteWarning,
        input.isAlimonyClaim,
    );

    useExecutionDashboardFieldVisitScheduledListener({
        executionDataId: input.executionData?.id,
        executionId: input.executionId,
        decisionsStorageExecutionId: input.decisionsStorageExecutionId,
        executorApprovalActions: input.executorApprovalActions,
    });

    useExecutionDashboardMaritalFurnitureFinancialSync({
        isMaritalFurnitureClaim: input.isMaritalFurnitureClaim,
        executionData: input.executionData,
        maritalFurnitureItemsForFollowup: input.maritalFurnitureItemsForFollowup,
        persistExecutionMerge: input.persistExecutionMerge,
        decisionsStorageExecutionId: input.decisionsStorageExecutionId,
        executionId: input.executionId,
    });

    useExecutionDashboardTimelineDedupeSync({
        executionData: input.executionData,
        timelineEvents: input.timelineEvents,
        activeSubFileId: input.activeSubFileId,
        parentDossierId: input.parentDossierId,
        setTimelineEvents: input.setTimelineEvents,
        persistExecutionMerge: input.persistExecutionMerge,
    });

    useExecutionDashboardSeizureRequestCreatedListener({
        executionData: input.executionData,
        executionId: input.executionId,
        seizureDraftsByDecisionIdRef: input.seizureDraftsByDecisionIdRef,
        seizedAssetsSnapshotRef: input.seizedAssetsSnapshotRef,
        setSeizureDraftsByDecisionId: input.setSeizureDraftsByDecisionId,
        setTimelineEvents: input.setTimelineEvents,
        nextTimelineId: input.nextTimelineId,
        persistExecutionMerge: input.persistExecutionMerge,
    });

    useExecutionDashboardGuarantorDecisionSync({
        executionData: input.executionData,
        decisionsReloadEpoch: input.decisionsReloadEpoch,
        decisionsStorageExecutionId: input.decisionsStorageExecutionId,
        persistExecutionMerge: input.persistExecutionMerge,
    });

    useExecutionDashboardDeceasedDebtorCoerciveReset({
        activeDebtorIsDeceased: input.activeDebtorIsDeceased,
        activeCoerciveActions: input.activeCoerciveActions,
        debtorArrested: input.debtorArrested,
        investigationPathDebtorPresent: input.investigationPathDebtorPresent,
        executionData: input.executionData,
        setActiveCoerciveActions: input.setActiveCoerciveActions,
        setDebtorArrested: input.setDebtorArrested,
        setInvestigationPathDebtorPresent: input.setInvestigationPathDebtorPresent,
        persistExecutionMerge: input.persistExecutionMerge,
    });

    useExecutionDashboardWindowEventListeners({
        executionData: input.executionData,
        executionId: input.executionId,
        decisionsStorageExecutionId: input.decisionsStorageExecutionId,
        setShowDecisionsModal: input.setShowDecisionsModal,
        openExecutionSeizuresTab: input.openExecutionSeizuresTab,
        pushTimelineEventRef: input.pushTimelineEventRef,
        nextTimelineId: input.nextTimelineId,
        showDecisionsModal: input.showDecisionsModal,
        showHeirsNotificationModal: input.showHeirsNotificationModal,
        setShowHeirsNotificationModal: input.setShowHeirsNotificationModal,
    });
}
