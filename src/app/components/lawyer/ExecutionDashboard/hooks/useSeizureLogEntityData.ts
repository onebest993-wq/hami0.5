import { readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';
import type { ExecutionFile } from '@/app/types/execution';
import { useMemo } from 'react';
import type { SeizedMovable, SeizedProperty } from '@/app/types/execution';
import { resolveSeizureWorkflowDossierId } from '../utils/seizureWorkflowDossierUtils';

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

    const storageExecutionId = useMemo(
        () =>
            resolveSeizureWorkflowDossierId({
                decisionsStorageExecutionId: input.decisionsStorageExecutionId,
                executionDataId: input.viewExecutionData?.id,
                executionData: input.viewExecutionData as Record<string, unknown> | undefined,
            }),
        [input.decisionsStorageExecutionId, input.viewExecutionData],
    );

    const seizureLogExecutorDecisions = useMemo(
        () =>
            readExecutorDecisionsArray(
                storageExecutionId,
                input.viewExecutionData as Record<string, unknown> | undefined,
            ) as Array<Record<string, unknown>>,
        [storageExecutionId, input.viewExecutionData, input.decisionsReloadEpoch],
    );

    return {
        seizedPropertiesForSeizureLog,
        seizedMovablesForSeizureLog,
        seizureLogExecutorDecisions,
    };
}
