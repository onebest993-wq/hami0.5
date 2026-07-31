import React, { useCallback, useMemo, useRef } from 'react';
import type { ExecutionFile, SeizedAsset, TimelineEvent } from '@/app/types/execution';
import type { ExecutorApprovalActions } from '@/app/utils/executorApprovalWorkflow';
import {
    DecisionsAndAppealsEngine,
    type DecisionsDispatcherHubProps,
} from './DecisionsAndAppealsEngine';

export interface DecisionsHubProps {
    executionId: string | undefined;
    onTimelineUpdate: (event: TimelineEvent) => void;
    evictionExecutorWorkflow?: {
        dossierId: string;
        actions: ExecutorApprovalActions;
    };
    /** وضع معاينة تاريخية — قراءة فقط داخل المحرك */
    isHistoricalMode?: boolean;
    executionData: ExecutionFile | null;
    seizedAssets: SeizedAsset[];
    seizureDraftsByDecisionId?: Record<string, SeizedAsset>;
    persistExecutionMerge: DecisionsDispatcherHubProps['persistExecutionMerge'];
    pushTimelineEvent: DecisionsDispatcherHubProps['pushTimeline'];
    nextTimelineId: DecisionsDispatcherHubProps['nextTimelineId'];
    syncSeizedAssets?: DecisionsDispatcherHubProps['syncSeizedAssets'];
    syncSeizureDrafts?: DecisionsDispatcherHubProps['syncSeizureDrafts'];
    syncActiveCoerciveActions?: DecisionsDispatcherHubProps['syncActiveCoerciveActions'];
    bootHubTab?: 'current' | 'previous' | 'appeals' | null;
    decisionsScrollToIdOnBoot?: string | null;
    appealsScrollToIdOnBoot?: string | null;
    /** لقطات السجل عند قرار المنفذ ومسارات الطعن */
    getMilestoneTimelineSnapshot?: () => unknown;
}

type LiveDispatcherHub = DecisionsDispatcherHubProps & {
    getTimelineSnapshot?: () => unknown;
};

function useStableDispatcherHub(live: LiveDispatcherHub): DecisionsDispatcherHubProps {
    const liveRef = useRef(live);
    liveRef.current = live;

    return useMemo(
        () => ({
            get executionData() {
                return liveRef.current.executionData ?? null;
            },
            get seizedAssets() {
                return liveRef.current.seizedAssets ?? [];
            },
            get seizureDraftsByDecisionId() {
                return liveRef.current.seizureDraftsByDecisionId;
            },
            persistExecutionMerge: (patch) => liveRef.current.persistExecutionMerge?.(patch),
            pushTimeline: (event, opts) => liveRef.current.pushTimeline?.(event, opts),
            nextTimelineId: () => liveRef.current.nextTimelineId?.() ?? '',
            syncSeizedAssets: (assets) => liveRef.current.syncSeizedAssets?.(assets),
            syncSeizureDrafts: (drafts) => liveRef.current.syncSeizureDrafts?.(drafts),
            syncActiveCoerciveActions: (actions) =>
                liveRef.current.syncActiveCoerciveActions?.(actions),
            getTimelineSnapshot: () => liveRef.current.getTimelineSnapshot?.(),
        }),
        [],
    );
}

const MemoDecisionsAndAppealsEngine = React.memo(DecisionsAndAppealsEngine);

/**
 * مركز «القرارات والطعون» مع توجيه أحداث المنفذ (useDecisionDispatcher داخل المحرك عند تمرير dispatcherHub).
 */
export const DecisionsHub: React.FC<DecisionsHubProps> = ({
    executionId,
    onTimelineUpdate,
    evictionExecutorWorkflow,
    isHistoricalMode = false,
    executionData,
    seizedAssets,
    seizureDraftsByDecisionId,
    persistExecutionMerge,
    pushTimelineEvent,
    nextTimelineId,
    syncSeizedAssets,
    syncSeizureDrafts,
    syncActiveCoerciveActions,
    bootHubTab,
    decisionsScrollToIdOnBoot,
    appealsScrollToIdOnBoot,
    getMilestoneTimelineSnapshot,
}) => {
    const onTimelineUpdateRef = useRef(onTimelineUpdate);
    onTimelineUpdateRef.current = onTimelineUpdate;
    const stableOnTimelineUpdate = useCallback((event: TimelineEvent) => {
        onTimelineUpdateRef.current?.(event);
    }, []);

    const getMilestoneTimelineSnapshotRef = useRef(getMilestoneTimelineSnapshot);
    getMilestoneTimelineSnapshotRef.current = getMilestoneTimelineSnapshot;
    const stableGetMilestoneTimelineSnapshot = useCallback(() => {
        return getMilestoneTimelineSnapshotRef.current?.();
    }, []);

    const dispatcherHub = useStableDispatcherHub({
        executionData,
        seizedAssets,
        seizureDraftsByDecisionId,
        persistExecutionMerge,
        pushTimeline: pushTimelineEvent,
        nextTimelineId,
        syncSeizedAssets,
        syncSeizureDrafts,
        syncActiveCoerciveActions,
        getTimelineSnapshot: getMilestoneTimelineSnapshot,
    });

    return (
        <MemoDecisionsAndAppealsEngine
            executionId={executionId}
            onTimelineUpdate={stableOnTimelineUpdate}
            evictionExecutorWorkflow={evictionExecutorWorkflow}
            isHistoricalMode={isHistoricalMode}
            getMilestoneTimelineSnapshot={stableGetMilestoneTimelineSnapshot}
            bootHubTab={bootHubTab ?? undefined}
            decisionsScrollToIdOnBoot={decisionsScrollToIdOnBoot ?? undefined}
            appealsScrollToIdOnBoot={appealsScrollToIdOnBoot ?? undefined}
            dispatcherHub={dispatcherHub}
        />
    );
};

export default DecisionsHub;
