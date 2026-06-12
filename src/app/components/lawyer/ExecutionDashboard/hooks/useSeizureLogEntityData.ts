import { useMemo } from 'react';
import type { ExecutionFile, SeizedMovable, SeizedProperty } from '@/app/types/execution';
import { readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';

export function useSeizureLogEntityData(input: {
    viewExecutionData: ExecutionFile | null | undefined;
    decisionsStorageExecutionId?: string;
    decisionsReloadEpoch?: number;
}) {
    const seizedPropertiesForSeizureLog = useMemo(() => {
        const list = Array.isArray((input.viewExecutionData as { seizedProperties?: unknown })?.seizedProperties)
            ? (((input.viewExecutionData as { seizedProperties?: SeizedProperty[] }).seizedProperties as SeizedProperty[]) ||
                  [])
            : [];
        return list;
    }, [input.viewExecutionData]);

    const seizedMovablesForSeizureLog = useMemo(() => {
        const list = Array.isArray((input.viewExecutionData as { seizedMovables?: unknown })?.seizedMovables)
            ? (((input.viewExecutionData as { seizedMovables?: SeizedMovable[] }).seizedMovables as SeizedMovable[]) ||
                  [])
            : [];
        return list;
    }, [input.viewExecutionData]);

    const seizureLogExecutorDecisions = useMemo(
        () => readExecutorDecisionsArray(input.decisionsStorageExecutionId) as Array<Record<string, unknown>>,
        [input.decisionsStorageExecutionId, input.decisionsReloadEpoch]
    );

    return {
        seizedPropertiesForSeizureLog,
        seizedMovablesForSeizureLog,
        seizureLogExecutorDecisions,
    };
}
