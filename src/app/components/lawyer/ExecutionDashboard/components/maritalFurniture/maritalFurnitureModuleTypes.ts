import type { Dispatch, SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';

export interface MaritalFurnitureModuleProps {
    executionData: ExecutionFile | null | undefined;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    pushTimelineEvent?: (
        event: TimelineEvent,
        options?: { mergePatch?: Record<string, unknown> },
    ) => boolean | void;
    setTimelineEvents?: Dispatch<SetStateAction<TimelineEvent[]>>;
    timelineEvents?: TimelineEvent[];
    nextTimelineId?: () => string;
    todayYmd?: string;
    locked?: boolean;
}
