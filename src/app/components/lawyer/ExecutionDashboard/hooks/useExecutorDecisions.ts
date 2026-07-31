import * as React from 'react';
import { DECISIONS_RELOAD_EVENT } from '@/app/utils/executorSeizureDecisionQueue';
import { readExecutorDecisionsUnionAcrossCandidateIds } from '@/app/utils/executionDecisionsNamespace';
import { getEffectiveClaimTypes } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import {
    readExecutionDataForDomainGate,
    resolveExecutionDataForDomainGate,
} from '@/app/utils/executionDomainIsolation';
import { resolveDecisionsStorageExecutionId } from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/resolveDecisionsStorageExecutionId';

function readUnionForExecutorHook(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
): Record<string, unknown>[] {
    const exId = String(executionId || '').trim();
    if (!exId || exId === 'default') return [];
    const data = resolveExecutionDataForDomainGate(exId, executionData);
    const canonical = resolveDecisionsStorageExecutionId(exId, data);
    return readExecutorDecisionsUnionAcrossCandidateIds(
        canonical !== 'default' ? canonical : exId,
        data
    );
}

export function useExecutorDecisions(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
) {
    const exId = String(executionId || '').trim();
    const executionDataHintKey = React.useMemo(() => {
        if (!executionData || typeof executionData !== 'object') return '';
        const types = getEffectiveClaimTypes(executionData);
        const single = String(executionData.claimType || '').trim();
        return [
            String(executionData.id || '').trim(),
            String(executionData.parentDossierId || executionData.parentFileId || '').trim(),
            types.length ? types.join('|') : single,
        ].join(':');
    }, [executionData]);
    const [rows, setRows] = React.useState<Record<string, unknown>[]>(() =>
        readUnionForExecutorHook(exId, executionData)
    );

    React.useEffect(() => {
        const sync = () => setRows(readUnionForExecutorHook(exId, executionData));
        sync();
        window.addEventListener(DECISIONS_RELOAD_EVENT, sync);
        window.addEventListener('hami-execution-decision-outcome', sync as EventListener);
        window.addEventListener('focus', sync);
        return () => {
            window.removeEventListener(DECISIONS_RELOAD_EVENT, sync);
            window.removeEventListener('hami-execution-decision-outcome', sync as EventListener);
            window.removeEventListener('focus', sync);
        };
    }, [exId, executionData, executionDataHintKey]);

    return { executionId: exId, decisions: rows };
}

