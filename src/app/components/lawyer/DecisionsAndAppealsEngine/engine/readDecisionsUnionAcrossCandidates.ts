import { readExecutorDecisionsUnionAcrossCandidateIds } from '@/app/utils/executionDecisionsNamespace';
import type { Decision } from '../types';
import { resolveDecisionsStorageExecutionId } from './resolveDecisionsStorageExecutionId';

/** قراءة فقط — اتحاد القرارات من كل مفاتيح التخزين المحتملة */
export function readDecisionsUnionAcrossCandidates(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
    extraIds?: string[]
): { canonicalId: string; rows: Decision[] } {
    const canonicalId = resolveDecisionsStorageExecutionId(executionId, executionData);
    const rows = readExecutorDecisionsUnionAcrossCandidateIds(
        executionId,
        executionData,
        extraIds
    ) as unknown as Decision[];
    return { canonicalId, rows };
}
