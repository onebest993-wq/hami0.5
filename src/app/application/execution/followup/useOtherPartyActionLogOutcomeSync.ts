import { useEffect } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import {
    DECISIONS_RELOAD_EVENT,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import { syncOtherPartyActionLogOutcomes } from './otherPartyActionLogOutcome';

type Params = {
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    decisionsStorageExecutionId: string | undefined;
    decisionsReloadEpoch?: number;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
};

export function useOtherPartyActionLogOutcomeSync({
    executionData,
    executionId,
    decisionsStorageExecutionId,
    decisionsReloadEpoch = 0,
    persistExecutionMerge,
}: Params): void {
    useEffect(() => {
        const log = executionData?.other_party_actions_log;
        if (!Array.isArray(log) || log.length === 0) return;

        const storageId = String(decisionsStorageExecutionId || executionId || '').trim();
        if (!storageId) return;

        const decisions = readExecutorDecisionsArray(storageId);
        const { next, changed } = syncOtherPartyActionLogOutcomes(log, decisions);
        if (changed) {
            persistExecutionMerge({ other_party_actions_log: next });
        }
    }, [
        decisionsReloadEpoch,
        decisionsStorageExecutionId,
        executionData?.other_party_actions_log,
        executionId,
        persistExecutionMerge,
    ]);

    useEffect(() => {
        const onReload = () => {
            const log = executionData?.other_party_actions_log;
            if (!Array.isArray(log) || log.length === 0) return;

            const storageId = String(decisionsStorageExecutionId || executionId || '').trim();
            if (!storageId) return;

            const decisions = readExecutorDecisionsArray(storageId);
            const { next, changed } = syncOtherPartyActionLogOutcomes(log, decisions);
            if (changed) {
                persistExecutionMerge({ other_party_actions_log: next });
            }
        };

        if (typeof window === 'undefined') return undefined;
        window.addEventListener(DECISIONS_RELOAD_EVENT, onReload);
        return () => window.removeEventListener(DECISIONS_RELOAD_EVENT, onReload);
    }, [
        decisionsStorageExecutionId,
        executionData?.other_party_actions_log,
        executionId,
        persistExecutionMerge,
    ]);
}
