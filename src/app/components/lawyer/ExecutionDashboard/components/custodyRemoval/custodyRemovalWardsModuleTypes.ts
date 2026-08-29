import type { Dispatch, SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';

export interface CustodyRemovalWardsModuleProps {
    executionId?: string;
    parentDossierId?: string;
    activeSubFileId?: string | null;
    isInabaActive?: boolean;
    executionData: ExecutionFile | null | undefined;
    custodyWardNames: string[];
    timelineEvents: TimelineEvent[];
    todayYmd: string;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    nextTimelineId: () => string;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}
