// @ts-nocheck
/** inaba / subfile timeline lifecycle — موجة 13 */
import { useEffect, useRef } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ExecutionFile, RealEstateSeizureAsset, SeizedAsset, TimelineEvent } from '@/app/types/execution';
import { ensureSubDossierOpenedTimelineEvent } from '@/app/stores';
import {
    buildExecutionFileCoerciveRefreshPatch,
    buildExecutionFileLocalHydratePatch,
    timelineHasSubDossierOpenedEvent,
} from './executionDashboardDossierBootSync';

export function useExecutionDashboardSubDossierTimelineLifecycle({
    activeSubFileId,
    isInabaActive,
    parentDossierId,
    executionData,
    executionDashboardFileId,
    setShowOnlyActiveFileTimeline,
    setTimelineEvents,
    persistExecutionMergeRef,
    setCaseNotesLog,
    setCaseTasksPending,
    setSeizedAssets,
    setSeizureDraftsByDecisionId,
    setActiveCoerciveActions,
    setRealEstateSeizureAssets,
}: {
    activeSubFileId: string | null | undefined;
    isInabaActive: boolean;
    parentDossierId: string;
    executionData: ExecutionFile | null | undefined;
    executionDashboardFileId: string | null;
    setShowOnlyActiveFileTimeline: Dispatch<SetStateAction<boolean>>;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    persistExecutionMergeRef: MutableRefObject<((patch: Record<string, unknown>) => void) | null>;
    setCaseNotesLog: Dispatch<SetStateAction<NonNullable<ExecutionFile['caseNotesLog']>>>;
    setCaseTasksPending: Dispatch<SetStateAction<NonNullable<ExecutionFile['caseTasksPending']>>>;
    setSeizedAssets: Dispatch<SetStateAction<SeizedAsset[]>>;
    setSeizureDraftsByDecisionId: Dispatch<SetStateAction<Record<string, SeizedAsset>>>;
    setActiveCoerciveActions: Dispatch<SetStateAction<string[]>>;
    setRealEstateSeizureAssets: Dispatch<SetStateAction<RealEstateSeizureAsset[]>>;
}) {
    const subDossierOpenedBackfillSigRef = useRef('');

    useEffect(() => {
        if (activeSubFileId) {
            setShowOnlyActiveFileTimeline(true);
        }
    }, [activeSubFileId, setShowOnlyActiveFileTimeline]);

    useEffect(() => {
        if (!isInabaActive || !activeSubFileId || !parentDossierId) return;
        const sig = `${activeSubFileId}:${parentDossierId}`;
        const tls = Array.isArray(executionData?.timelineEvents) ? executionData.timelineEvents : [];

        if (timelineHasSubDossierOpenedEvent(tls, activeSubFileId)) {
            subDossierOpenedBackfillSigRef.current = sig;
            return;
        }
        if (subDossierOpenedBackfillSigRef.current === sig) return;
        subDossierOpenedBackfillSigRef.current = sig;

        const next = ensureSubDossierOpenedTimelineEvent(
            tls,
            activeSubFileId,
            parentDossierId,
            String(executionData?.directorate || executionData?.delegationTargetDirectorate || ''),
        );
        setTimelineEvents(next);
        queueMicrotask(() => {
            persistExecutionMergeRef.current?.({ timelineEvents: next });
        });
    }, [
        isInabaActive,
        activeSubFileId,
        parentDossierId,
        executionData?.id,
        executionData?.directorate,
        executionData?.delegationTargetDirectorate,
        executionData?.timelineEvents,
        persistExecutionMergeRef,
        setTimelineEvents,
    ]);

    useEffect(() => {
        subDossierOpenedBackfillSigRef.current = '';
    }, [activeSubFileId, isInabaActive]);

    useEffect(() => {
        if (!executionData?.id) return;
        const patch = buildExecutionFileLocalHydratePatch(
            executionData,
            activeSubFileId,
            parentDossierId,
        );
        setTimelineEvents(patch.timelineEvents);
        setCaseNotesLog(patch.caseNotesLog);
        setCaseTasksPending(patch.caseTasksPending);
        setSeizedAssets(patch.seizedAssets);
        setSeizureDraftsByDecisionId(patch.seizureDraftsByDecisionId);
        setActiveCoerciveActions(patch.activeCoerciveActions);
        setRealEstateSeizureAssets(patch.realEstateSeizureAssets ?? []);
    }, [executionDashboardFileId, activeSubFileId, parentDossierId, executionData?.directorate]);
}

export function useExecutionDashboardExecutionFileCoerciveRefresh({
    executionData,
    setSeizedAssets,
    setActiveCoerciveActions,
    setSeizureDraftsByDecisionId,
    setForcedAttendanceIssued,
    setActiveNoticeState,
    setCaseTasksPending,
}: {
    executionData: ExecutionFile | null | undefined;
    setSeizedAssets: Dispatch<SetStateAction<SeizedAsset[]>>;
    setActiveCoerciveActions: Dispatch<SetStateAction<string[]>>;
    setSeizureDraftsByDecisionId: Dispatch<SetStateAction<Record<string, SeizedAsset>>>;
    setForcedAttendanceIssued: Dispatch<SetStateAction<boolean>>;
    setActiveNoticeState: Dispatch<SetStateAction<ExecutionFile['activeNoticeState']>>;
    setCaseTasksPending: Dispatch<SetStateAction<NonNullable<ExecutionFile['caseTasksPending']>>>;
}) {
    useEffect(() => {
        if (!executionData?.id) return;
        const patch = buildExecutionFileCoerciveRefreshPatch(executionData);
        setSeizedAssets(patch.seizedAssets);
        setActiveCoerciveActions(patch.activeCoerciveActions);
        setSeizureDraftsByDecisionId(patch.seizureDraftsByDecisionId);
        setForcedAttendanceIssued(patch.forcedAttendanceIssued);
        setActiveNoticeState(patch.activeNoticeState);
        setCaseTasksPending(patch.caseTasksPending);
    }, [
        executionData?.id,
        executionData?.updatedAt,
        executionData?.seizedAssets,
        executionData?.forcedAttendanceIssued,
        executionData?.activeNoticeState,
        executionData?.activeCoerciveActions,
        executionData?.seizureDraftsByDecisionId,
        executionData?.caseTasksPending,
    ]);
}
