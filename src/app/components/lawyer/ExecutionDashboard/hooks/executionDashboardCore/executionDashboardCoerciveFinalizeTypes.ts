import type { MutableRefObject } from 'react';
import type { ExecutionFile, SeizedAsset, TimelineEvent } from '@/app/types/execution';

export type FinalizeCoerciveSeizureInput = {
    actionType: string;
    details: Record<string, string>;
    directDecisionRowId: string;
    seizureDetailCompletion: { actionType: string; decisionRowId: string; assetId?: string } | null;
    setSeizureDetailCompletion: (v: null) => void;
    seizedAssets: SeizedAsset[];
    setSeizedAssets: (assets: SeizedAsset[]) => void;
    activeDebtorIsDeceased: boolean;
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    decisionsStorageExecutionId: string | undefined;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    activeWorkspaceDebtorForFollowup: { isPrimary?: boolean; key?: string } | null | undefined;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    nextTimelineId: () => string;
    timelineEvents: TimelineEvent[];
    setTimelineEvents: (events: TimelineEvent[]) => void;
    setSeizureDraftsByDecisionId: (drafts: Record<string, SeizedAsset>) => void;
    seizureDraftsByDecisionIdRef: MutableRefObject<Record<string, SeizedAsset>>;
    showToast: (message: string, type?: string, opts?: { decisionsLink?: boolean }) => void;
    setLastActionDate: (ymd: string) => void;
};
