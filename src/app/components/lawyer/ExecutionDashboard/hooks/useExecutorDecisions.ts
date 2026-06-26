import * as React from 'react';
import { DECISIONS_RELOAD_EVENT } from '@/app/utils/executorSeizureDecisionQueue';
import { readExecutorDecisionsUnionAcrossCandidateIds } from '@/app/utils/executionDecisionsNamespace';
import { readExecutionDataForDomainGate } from '@/app/utils/executionDomainIsolation';
import { resolveDecisionsStorageExecutionId } from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/resolveDecisionsStorageExecutionId';

function readUnionForExecutorHook(executionId: string | undefined): Record<string, unknown>[] {
    const exId = String(executionId || '').trim();
    if (!exId || exId === 'default') return [];
    const data = readExecutionDataForDomainGate(exId);
    const canonical = resolveDecisionsStorageExecutionId(exId, data);
    return readExecutorDecisionsUnionAcrossCandidateIds(
        canonical !== 'default' ? canonical : exId,
        data
    );
}

export function useExecutorDecisions(executionId: string | undefined) {
    const exId = String(executionId || '').trim();
    const [rows, setRows] = React.useState<Record<string, unknown>[]>(() =>
        readUnionForExecutorHook(exId)
    );

    React.useEffect(() => {
        const sync = () => setRows(readUnionForExecutorHook(exId));
        sync();
        window.addEventListener(DECISIONS_RELOAD_EVENT, sync);
        window.addEventListener('hami-execution-decision-outcome', sync as EventListener);
        window.addEventListener('focus', sync);
        return () => {
            window.removeEventListener(DECISIONS_RELOAD_EVENT, sync);
            window.removeEventListener('hami-execution-decision-outcome', sync as EventListener);
            window.removeEventListener('focus', sync);
        };
    }, [exId]);

    return { executionId: exId, decisions: rows };
}

