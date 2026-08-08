import { useCallback, useEffect, useMemo, useState } from 'react';
import { DECISIONS_RELOAD_EVENT } from '@/app/utils/executorSeizureDecisionQueue';
import {
    readExecutorDecisionsUnionAcrossCandidateIds,
    warmExecutorDecisionsStorage,
} from '@/app/utils/executionDecisionsNamespace';
import { getEffectiveClaimTypes } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import {
    readExecutionDataForDomainGate,
    resolveExecutionDataForDomainGate,
} from '@/app/utils/executionDomainIsolation';
import { resolveDecisionsStorageExecutionId } from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/resolveDecisionsStorageExecutionId';

function resolveFollowupTabStorageId(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
): string {
    const raw = String(executionId || '').trim();
    const data = resolveExecutionDataForDomainGate(raw || undefined, executionData);
    const canonical = resolveDecisionsStorageExecutionId(raw || undefined, data);
    if (canonical !== 'default') return canonical;
    return raw;
}

/**
 * قراءة موحّدة لقرارات تبويبات محضر المتابعة — مع تسخين IDB بعد Reload.
 */
export function useFollowupTabDecisionsLoader(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
) {
    const executionDataHintKey = useMemo(() => {
        if (!executionData || typeof executionData !== 'object') return '';
        const types = getEffectiveClaimTypes(executionData);
        const single = String(executionData.claimType || '').trim();
        return [
            String(executionData.id || '').trim(),
            String(executionData.parentDossierId || executionData.parentFileId || '').trim(),
            types.length ? types.join('|') : single,
        ].join(':');
    }, [executionData]);

    const storageExecutionId = useMemo(
        () => resolveFollowupTabStorageId(executionId, executionData),
        [executionId, executionData, executionDataHintKey],
    );

    const readUnion = useCallback(() => {
        const exId = storageExecutionId;
        if (!exId || exId === 'default') return [];
        const data = resolveExecutionDataForDomainGate(exId, executionData);
        return readExecutorDecisionsUnionAcrossCandidateIds(exId, data);
    }, [storageExecutionId, executionData]);

    const [decisions, setDecisions] = useState<Record<string, unknown>[]>(() => readUnion());

    useEffect(() => {
        const sync = () => setDecisions(readUnion());
        sync();
        void warmExecutorDecisionsStorage(storageExecutionId, executionData).then(sync);
        window.addEventListener(DECISIONS_RELOAD_EVENT, sync);
        window.addEventListener('hami-execution-decision-outcome', sync as EventListener);
        window.addEventListener('focus', sync);
        return () => {
            window.removeEventListener(DECISIONS_RELOAD_EVENT, sync);
            window.removeEventListener('hami-execution-decision-outcome', sync as EventListener);
            window.removeEventListener('focus', sync);
        };
    }, [storageExecutionId, executionData, executionDataHintKey, readUnion]);

    return { decisions, storageExecutionId };
}
