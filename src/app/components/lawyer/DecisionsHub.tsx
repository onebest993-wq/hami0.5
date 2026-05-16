import React from 'react';
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
}) => (
    <DecisionsAndAppealsEngine
        executionId={executionId}
        onTimelineUpdate={onTimelineUpdate}
        evictionExecutorWorkflow={evictionExecutorWorkflow}
        isHistoricalMode={isHistoricalMode}
        getMilestoneTimelineSnapshot={getMilestoneTimelineSnapshot}
        bootHubTab={bootHubTab ?? undefined}
        decisionsScrollToIdOnBoot={decisionsScrollToIdOnBoot ?? undefined}
        appealsScrollToIdOnBoot={appealsScrollToIdOnBoot ?? undefined}
        dispatcherHub={{
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
        }}
    />
);

export default DecisionsHub;
