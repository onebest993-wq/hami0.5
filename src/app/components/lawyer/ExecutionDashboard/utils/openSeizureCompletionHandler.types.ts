/** أنواع فقط — لقطع اعتماد القيمة عن جذع ED */
import type React from 'react';
import type { ExecutionFile, SeizedAsset, TimelineEvent } from '@/app/types/execution';

export type OpenSeizureCompletionDetail = {
    executionId?: string;
    decisionId?: string;
};

export type SeizureDetailCompletionState = {
    decisionRowId: string;
    assetId: string;
    actionType: 'salary' | 'property' | 'vehicle';
};

export type OpenSeizureCompletionContext = {
    executionDataId?: string;
    executionId?: string;
    executionDataRef: React.MutableRefObject<ExecutionFile | null>;
    persistExecutionMergeRef: React.MutableRefObject<((patch: Record<string, unknown>) => void) | null>;
    pushTimelineEventRef: React.MutableRefObject<
        ((event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }) => void) | null
    >;
    nextTimelineId: () => string;
    focusSeizurePropertyInlineRef: React.MutableRefObject<(decisionId: string, subject?: string) => void>;
    focusSeizureMovableInlineRef: React.MutableRefObject<(decisionId: string, subject?: string) => void>;
    focusSeizureThirdPartyInlineRef: React.MutableRefObject<(decisionId: string, subject?: string) => void>;
    focusSeizureNoticeInlineRef: React.MutableRefObject<(decisionId: string, subject?: string) => void>;
    seizedAssetsSnapshotRef: React.MutableRefObject<SeizedAsset[]>;
    setSeizedAssets: React.Dispatch<React.SetStateAction<SeizedAsset[]>>;
    setSeizureDetailCompletion: React.Dispatch<React.SetStateAction<SeizureDetailCompletionState | null>>;
};
