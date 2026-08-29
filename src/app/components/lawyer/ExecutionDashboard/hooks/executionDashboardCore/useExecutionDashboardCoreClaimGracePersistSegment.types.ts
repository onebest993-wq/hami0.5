import type { ExecutionFile } from '@/app/types/execution';
import type { ExecutionDashboardProps } from '../../types';
import type { useExecutionDashboardCoreFileMetadataBinding } from './useExecutionDashboardCoreFileMetadataBinding';
import type { useExecutionDashboardCoreFollowupDebtorPipeline } from './useExecutionDashboardCoreFollowupDebtorPipeline';
import type { ExecutionDashboardCoreBootPipelineValue } from './executionDashboardCoreBootPipelineTypes';
import type { ExecutionDashboardCoreWorkspacePipelineValue } from './executionDashboardCoreWorkspacePipelineTypes';

export type ExecutionDashboardCoreClaimGracePersistSegmentParams = {
    boot: ExecutionDashboardCoreBootPipelineValue;
    file: ExecutionDashboardProps['file'];
    executionId: string | undefined;
    onUpdate: ExecutionDashboardProps['onUpdate'];
    executionData: ExecutionFile | null | undefined;
    viewExecutionData: ExecutionFile | null | undefined;
    executionDataRef: import('react').MutableRefObject<ExecutionFile | null>;
    workspacePipeline: ExecutionDashboardCoreWorkspacePipelineValue;
    fileMetadataBinding: ReturnType<typeof useExecutionDashboardCoreFileMetadataBinding>;
    followupDebtor: ReturnType<typeof useExecutionDashboardCoreFollowupDebtorPipeline>;
    showToast: (
        message: string,
        type?: 'success' | 'error' | 'warning' | 'info',
        _legacyOptions?: unknown,
    ) => void;
    gracePeriodEnded: boolean;
    setShowStatuteWarning: (show: boolean) => void;
};
