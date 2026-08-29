/** Phase C Slice 27 — summons profile + persist/save + trash/party edit sync */
import type { ExecutionDashboardCorePersistHandlerPipelineInput } from './executionDashboardCorePersistHandlerPipelineInput';
import { useExecutionDashboardCorePersistSummonsNoticeSegment } from './useExecutionDashboardCorePersistSummonsNoticeSegment';
import { useExecutionDashboardCorePersistSaveEditSegment } from './useExecutionDashboardCorePersistSaveEditSegment';

export function useExecutionDashboardCorePersistHandlerPipeline(
    p: ExecutionDashboardCorePersistHandlerPipelineInput,
) {
    const summonsNotice = useExecutionDashboardCorePersistSummonsNoticeSegment(p);
    const saveEdit = useExecutionDashboardCorePersistSaveEditSegment(p);
    return { ...summonsNotice, ...saveEdit };
}
