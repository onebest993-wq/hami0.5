import type { ExecutionDashboardProps } from '../../types';
import { useExecutionDashboardCoreBootPipelineImpl } from './useExecutionDashboardCoreBootPipelineImpl';

export function useExecutionDashboardCoreBootPipeline(
    input: Pick<ExecutionDashboardProps, 'file' | 'executionId'>,
) {
    return useExecutionDashboardCoreBootPipelineImpl(input);
}
