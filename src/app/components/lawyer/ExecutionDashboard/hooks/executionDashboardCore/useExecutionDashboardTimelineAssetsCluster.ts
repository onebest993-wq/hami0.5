import type { Dispatch, SetStateAction } from 'react';
import type { ExecutionDashboardCoreWorkspacePipelineInput } from './executionDashboardCoreWorkspacePipelineInput';
import type { CoercionBridge } from './timelineAssetsClusterHelpers';
import { useExecutionDashboardTimelineAssetsClusterImpl } from './useExecutionDashboardTimelineAssetsClusterImpl';

export function useExecutionDashboardTimelineAssetsCluster(input: {
    p: ExecutionDashboardCoreWorkspacePipelineInput;
    coercionOrchestrator: CoercionBridge;
    setForcedAttendanceIssued: Dispatch<SetStateAction<boolean>>;
}) {
    return useExecutionDashboardTimelineAssetsClusterImpl(input);
}
