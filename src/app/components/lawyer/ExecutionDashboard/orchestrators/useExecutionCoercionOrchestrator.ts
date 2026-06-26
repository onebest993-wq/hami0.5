import { useExecutionCoercionSummonsPipeline } from '../hooks/useExecutionCoercionSummonsPipeline';
import type { ExecutionFileKey, ExecutionOrchestratorSlice } from './executionOrchestratorTypes';
import type { ExecutionFile } from '@/app/types/execution';

/** مسار الإكراه والاستدعاء والتحقيق */
export function useExecutionCoercionOrchestrator(
    executionFileKey: ExecutionFileKey,
    executionData: ExecutionFile | null | undefined,
): ExecutionOrchestratorSlice {
    return useExecutionCoercionSummonsPipeline(executionFileKey, executionData);
}
