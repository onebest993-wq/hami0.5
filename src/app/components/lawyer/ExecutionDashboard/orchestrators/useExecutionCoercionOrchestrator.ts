import { useExecutionCoercionSummonsPipeline } from '../hooks/useExecutionCoercionSummonsPipeline';
import type { ExecutionFileKey } from './executionOrchestratorTypes';
import type { ExecutionFile } from '@/app/types/execution';

import type { ExecutionCoercionOrchestratorSlice } from './executionCoercionOrchestratorTypes';

/** مسار الإكراه والاستدعاء والتحقيق */
export function useExecutionCoercionOrchestrator(
    executionFileKey: ExecutionFileKey,
    executionData: ExecutionFile | null | undefined,
): ExecutionCoercionOrchestratorSlice {
    return useExecutionCoercionSummonsPipeline(executionFileKey, executionData);
}
