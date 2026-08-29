import { readExecutorDecisionsUnionForExecution } from '@/app/utils/executionDecisionsNamespace';
import { readExecutionDataForDomainGate } from '@/app/utils/executionDomainIsolation';

export function readExecutorDecisionsArray(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
): Record<string, unknown>[] {
    try {
        const data = executionData ?? readExecutionDataForDomainGate(executionId);
        return readExecutorDecisionsUnionForExecution(executionId, data);
    } catch {
        return [];
    }
}
