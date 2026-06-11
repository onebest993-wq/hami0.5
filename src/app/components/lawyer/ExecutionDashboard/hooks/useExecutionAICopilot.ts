import { useMemo, useCallback } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { executionRowAppealPipelineActive } from '@/app/utils/executionDecisionAppealActive';
import { readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';

interface UseExecutionAICopilotParams {
    executionData: ExecutionFile | null | undefined;
    decisionsStorageExecutionId: string;
    decisionsReloadEpoch: number;
}

/** V1 stub — AI copilot removed; keeps decision/snapshot helpers for execution dashboard. */
export function useExecutionAICopilot(params: UseExecutionAICopilotParams) {
    const { executionData, decisionsStorageExecutionId, decisionsReloadEpoch } = params;

    const executionCopilotDecisions = useMemo(
        () => readExecutorDecisionsArray(decisionsStorageExecutionId),
        [decisionsStorageExecutionId, decisionsReloadEpoch],
    );

    const firstActiveAppealDecisionId = useMemo(() => {
        const rows = readExecutorDecisionsArray(decisionsStorageExecutionId);
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            if (executionRowAppealPipelineActive(r)) {
                const id = r.id;
                if (typeof id === 'string' && id) return id;
            }
        }
        return null;
    }, [decisionsStorageExecutionId, decisionsReloadEpoch]);

    const executionCopilotSnapshot = useMemo(() => null, [executionData?.id]);

    const executionCopilotFingerprint = useMemo(() => 'none', [executionData?.id]);

    const runExecutionAICopilot = useCallback(async (_trigger: 'manual' | 'auto') => {
        /* no-op — AI copilot disabled in V1 */
    }, []);

    const triggerCopilotAfterLocalChange = useCallback(() => {
        /* no-op */
    }, []);

    const applyCopilotSuggestionAsNote = useCallback((_suggestion: unknown) => {
        /* no-op */
    }, []);

    const applyCopilotSuggestionAsTask = useCallback((_suggestion: unknown) => {
        /* no-op */
    }, []);

    const copyCopilotDraftText = useCallback(async (_suggestion: unknown) => {
        /* no-op */
    }, []);

    return {
        executionCopilotDecisions,
        firstActiveAppealDecisionId,
        executionCopilotSnapshot,
        executionCopilotFingerprint,
        runExecutionAICopilot,
        triggerCopilotAfterLocalChange,
        applyCopilotSuggestionAsNote,
        applyCopilotSuggestionAsTask,
        copyCopilotDraftText,
    };
}
