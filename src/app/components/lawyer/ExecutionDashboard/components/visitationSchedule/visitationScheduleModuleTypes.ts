import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';

export type WorkspaceTab = 'appointment' | 'calendar' | 'setup';

export interface VisitationScheduleModuleProps {
    executionData: ExecutionFile | null | undefined;
    visitChildNames: string[];
    fileNumber?: string;
    todayYmd: string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimelineEvent: (event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }) => void;
    nextTimelineId: () => string;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}
