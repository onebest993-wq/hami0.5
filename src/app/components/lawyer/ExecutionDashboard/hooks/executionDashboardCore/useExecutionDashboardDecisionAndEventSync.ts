// @ts-nocheck
import { useEffect, useRef, type MutableRefObject } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ExecutionFile, SeizedAsset, TimelineEvent } from '@/app/types/execution';
import { computeGuarantorApprovalMergePatch } from '@/app/utils/executorSeizureDecisionQueue';
import { readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';
import { hasApprovedLawyerFeePayout } from '@/app/utils/executorSeizureDecisionQueue';
import {
    buildDeceasedDebtorCoerciveResetPatch,
    deceasedDebtorHasStaleCoerciveState,
    evictionLawyerFeeBackfillMarker,
    mergeHeirInvestigationDecisionStatuses,
    shouldBackfillEvictionLawyerFeeRequested,
} from './executionDashboardHeirsAndDeceasedSync';
import type { ExecutorDecisionRowLite } from './executionDashboardPersonalCoerciveDecisionSync';
import {
    buildSeizurePendingDraft,
    buildSeizurePendingTimelineEvent,
    resolveSeizureActionTypeFromSubtype,
    seizureDecisionAlreadyMaterialized,
} from './executionDashboardSeizureRequestCreated';
import { HAMI_APPEND_EXECUTION_TIMELINE } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';

export function useExecutionDashboardGuarantorDecisionSync({
    executionData,
    decisionsReloadEpoch,
    decisionsStorageExecutionId,
    persistExecutionMerge,
}: {
    executionData: ExecutionFile | null | undefined;
    decisionsReloadEpoch: number;
    decisionsStorageExecutionId: string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
}) {
    useEffect(() => {
        if (!executionData) return;
        const patch = computeGuarantorApprovalMergePatch(
            decisionsStorageExecutionId,
            executionData,
        );
        if (!patch || Object.keys(patch).length === 0) return;
        persistExecutionMerge(patch);
    }, [
        decisionsReloadEpoch,
        decisionsStorageExecutionId,
        executionData,
        executionData?.id,
        executionData?.guarantor_followup,
        persistExecutionMerge,
    ]);
}

export function useExecutionDashboardDeceasedDebtorCoerciveReset({
    activeDebtorIsDeceased,
    activeCoerciveActions,
    debtorArrested,
    investigationPathDebtorPresent,
    executionData,
    setActiveCoerciveActions,
    setDebtorArrested,
    setInvestigationPathDebtorPresent,
    persistExecutionMerge,
}: {
    activeDebtorIsDeceased: boolean;
    activeCoerciveActions: unknown[];
    debtorArrested: boolean;
    investigationPathDebtorPresent: boolean;
    executionData: ExecutionFile | null | undefined;
    setActiveCoerciveActions: Dispatch<SetStateAction<unknown[]>>;
    setDebtorArrested: Dispatch<SetStateAction<boolean>>;
    setInvestigationPathDebtorPresent: Dispatch<SetStateAction<boolean>>;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
}) {
    useEffect(() => {
        if (!activeDebtorIsDeceased) return;
        if (
            !deceasedDebtorHasStaleCoerciveState({
                activeCoerciveActionsLength: activeCoerciveActions.length,
                debtorArrested,
                investigationPathDebtorPresent,
                forcedBringInPersonalOutcome: executionData?.forced_bring_in_personal_outcome,
                forcedBringInPersonalFollowupLogged:
                    executionData?.forced_bring_in_personal_followup_logged,
            })
        ) {
            return;
        }
        setActiveCoerciveActions([]);
        setDebtorArrested(false);
        setInvestigationPathDebtorPresent(false);
        persistExecutionMerge(buildDeceasedDebtorCoerciveResetPatch());
    }, [
        activeDebtorIsDeceased,
        activeCoerciveActions,
        debtorArrested,
        investigationPathDebtorPresent,
        executionData?.forced_bring_in_personal_outcome,
        executionData?.forced_bring_in_personal_followup_logged,
        persistExecutionMerge,
        setActiveCoerciveActions,
        setDebtorArrested,
        setInvestigationPathDebtorPresent,
    ]);
}

export function useExecutionDashboardEvictionLawyerFeeBackfill({
    isEvictionExecutionModule,
    executionData,
    executionId,
    executionFileKey,
    decisionsReloadEpoch,
    persistExecutionMerge,
}: {
    isEvictionExecutionModule: boolean;
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    executionFileKey: string;
    decisionsReloadEpoch: number;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
}) {
    const sessionMarkerRef = useRef<string | null>(null);

    useEffect(() => {
        sessionMarkerRef.current = null;
    }, [executionFileKey]);

    useEffect(() => {
        const id = String(executionData?.id ?? executionId ?? '');
        if (
            !shouldBackfillEvictionLawyerFeeRequested({
                isEvictionExecutionModule,
                executionId: id,
                alreadyRequested: executionData?.eviction_lawyer_fee_requested,
                hasApprovedPayout: hasApprovedLawyerFeePayout(id),
                sessionMarker: sessionMarkerRef.current,
            })
        ) {
            return;
        }
        sessionMarkerRef.current = evictionLawyerFeeBackfillMarker(id);
        persistExecutionMerge({ eviction_lawyer_fee_requested: true });
    }, [
        isEvictionExecutionModule,
        executionData?.id,
        executionId,
        executionData?.eviction_lawyer_fee_requested,
        decisionsReloadEpoch,
        persistExecutionMerge,
    ]);
}

export function useExecutionDashboardHeirsInvestigationSync({
    executionData,
    decisionsStorageExecutionId,
    decisionsReloadEpoch,
    persistExecutionMerge,
}: {
    executionData: ExecutionFile | null | undefined;
    decisionsStorageExecutionId: string;
    decisionsReloadEpoch: number;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
}) {
    useEffect(() => {
        if (!executionData?.id) return;
        const byHeir = executionData?.heirs_notification_workflow?.byHeir || {};
        const rows = readExecutorDecisionsArray(decisionsStorageExecutionId) as ExecutorDecisionRowLite[];
        const nextByHeir = mergeHeirInvestigationDecisionStatuses(byHeir, rows);
        if (!nextByHeir) return;
        persistExecutionMerge({
            heirs_notification_workflow: {
                hasReceivedInitialNotice: true,
                byHeir: nextByHeir,
            },
        });
    }, [
        executionData?.id,
        executionData?.heirs_notification_workflow?.byHeir,
        decisionsStorageExecutionId,
        decisionsReloadEpoch,
        persistExecutionMerge,
    ]);
}

export function useExecutionDashboardSeizureRequestCreatedListener({
    executionData,
    executionId,
    seizureDraftsByDecisionIdRef,
    seizedAssetsSnapshotRef,
    setSeizureDraftsByDecisionId,
    setTimelineEvents,
    nextTimelineId,
    persistExecutionMerge,
}: {
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    seizureDraftsByDecisionIdRef: MutableRefObject<Record<string, SeizedAsset> | null>;
    seizedAssetsSnapshotRef: MutableRefObject<SeizedAsset[]>;
    setSeizureDraftsByDecisionId: Dispatch<SetStateAction<Record<string, SeizedAsset>>>;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
}) {
    useEffect(() => {
        const myId = String(executionData?.id ?? executionId ?? '');
        if (!myId) return;

        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string; decisionId?: string; subtype?: string }>;
            if (String(ce.detail?.executionId ?? '') !== myId) return;
            const decisionId = String(ce.detail?.decisionId ?? '').trim();
            const subtype = String(ce.detail?.subtype ?? '').trim();
            if (!decisionId || !subtype) return;

            const actionType = resolveSeizureActionTypeFromSubtype(subtype);
            if (actionType === 'skip') return;

            if (
                seizureDecisionAlreadyMaterialized({
                    decisionId,
                    draftsByDecisionId: seizureDraftsByDecisionIdRef.current,
                    seizedAssets: seizedAssetsSnapshotRef.current,
                })
            ) {
                return;
            }

            const { draft, baseDesc, label } = buildSeizurePendingDraft(
                decisionId,
                subtype,
                actionType,
            );
            const ev = buildSeizurePendingTimelineEvent(decisionId, label, baseDesc, nextTimelineId);

            setSeizureDraftsByDecisionId((prev) => {
                const next = { ...prev, [decisionId]: draft };
                setTimelineEvents((tlPrev) => {
                    const nextTl = [ev, ...tlPrev];
                    persistExecutionMerge({ seizureDraftsByDecisionId: next, timelineEvents: nextTl });
                    return nextTl;
                });
                return next;
            });
        };

        window.addEventListener('hami-seizure-request-created', handler as EventListener);
        return () => window.removeEventListener('hami-seizure-request-created', handler as EventListener);
    }, [
        executionData?.id,
        executionId,
        nextTimelineId,
        persistExecutionMerge,
        seizureDraftsByDecisionIdRef,
        seizedAssetsSnapshotRef,
        setSeizureDraftsByDecisionId,
        setTimelineEvents,
    ]);
}

export function useExecutionDashboardWindowEventListeners({
    executionData,
    executionId,
    decisionsStorageExecutionId,
    setShowDecisionsModal,
    openExecutionSeizuresTab,
    pushTimelineEventRef,
    nextTimelineId,
    showDecisionsModal,
    showHeirsNotificationModal,
    setShowHeirsNotificationModal,
}: {
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    decisionsStorageExecutionId: string;
    setShowDecisionsModal: (show: boolean) => void;
    openExecutionSeizuresTab: () => void;
    pushTimelineEventRef: MutableRefObject<
        ((event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }) => void) | null
    >;
    nextTimelineId: () => string;
    showDecisionsModal: boolean;
    showHeirsNotificationModal: boolean;
    setShowHeirsNotificationModal: (show: boolean) => void;
}) {
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<{ executionId?: string }>).detail;
            const targetId = String(detail?.executionId || executionId || executionData?.id || '').trim();
            const currentId = String(executionId || executionData?.id || '').trim();
            if (targetId && currentId && targetId !== currentId) return;
            setShowDecisionsModal(false);
            openExecutionSeizuresTab();
        };
        window.addEventListener('hami-open-execution-coercive-tab', handler as EventListener);
        return () => window.removeEventListener('hami-open-execution-coercive-tab', handler as EventListener);
    }, [executionData?.id, executionId, openExecutionSeizuresTab, setShowDecisionsModal]);

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{
                executionId?: string;
                event?: Omit<TimelineEvent, 'id'>;
                mergePatch?: Record<string, unknown>;
            }>;
            const evId = String(ce.detail?.executionId ?? '').trim();
            const myId = String(executionData?.id ?? executionId ?? '').trim();
            const storeId = String(decisionsStorageExecutionId ?? '').trim();
            if (!evId || (evId !== myId && evId !== storeId)) return;
            const payload = ce.detail?.event;
            if (!payload) return;
            pushTimelineEventRef.current?.(
                { ...payload, id: nextTimelineId() },
                ce.detail?.mergePatch ? { mergePatch: ce.detail.mergePatch } : undefined,
            );
        };
        window.addEventListener(HAMI_APPEND_EXECUTION_TIMELINE, handler as EventListener);
        return () =>
            window.removeEventListener(HAMI_APPEND_EXECUTION_TIMELINE, handler as EventListener);
    }, [executionData?.id, executionId, decisionsStorageExecutionId, nextTimelineId, pushTimelineEventRef]);

    useEffect(() => {
        if (!showDecisionsModal) return;
        if (showHeirsNotificationModal) setShowHeirsNotificationModal(false);
    }, [showDecisionsModal, showHeirsNotificationModal, setShowHeirsNotificationModal]);
}
