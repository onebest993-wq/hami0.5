import * as React from 'react';
import { DECISIONS_RELOAD_EVENT } from '@/app/utils/executorSeizureDecisionQueue';
import {
    readExecutorDecisionsUnionAcrossCandidateIds,
    warmExecutorDecisionsStorage,
} from '@/app/utils/executionDecisionsNamespace';
import { getEffectiveClaimTypes } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import {
    resolveExecutionDataForDomainGate,
} from '@/app/utils/executionDomainIsolation';
import { resolveDecisionsStorageExecutionId } from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/resolveDecisionsStorageExecutionId';

function resolveExecutorHookExecutionId(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
): string {
    const raw = String(executionId || '').trim();
    const data = resolveExecutionDataForDomainGate(raw || undefined, executionData);
    const canonical = resolveDecisionsStorageExecutionId(raw || undefined, data);
    if (canonical !== 'default') return canonical;
    return raw;
}

function readUnionForExecutorHook(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
): Record<string, unknown>[] {
    const exId = resolveExecutorHookExecutionId(executionId, executionData);
    if (!exId || exId === 'default') return [];
    const data = resolveExecutionDataForDomainGate(exId, executionData);
    return readExecutorDecisionsUnionAcrossCandidateIds(exId, data);
}

function executorDecisionRowsShallowEqual(
    prev: Record<string, unknown>[],
    next: Record<string, unknown>[],
): boolean {
    if (prev.length !== next.length) return false;
    for (let i = 0; i < prev.length; i++) {
        const a = prev[i];
        const b = next[i];
        if (String(a.id ?? '') !== String(b.id ?? '')) return false;
        if (String(a.executorOutcome ?? '') !== String(b.executorOutcome ?? '')) return false;
        if (String(a.requestKind ?? '') !== String(b.requestKind ?? '')) return false;
        if (
            String((a as { specialFollowupAppliedAt?: string }).specialFollowupAppliedAt ?? '') !==
            String((b as { specialFollowupAppliedAt?: string }).specialFollowupAppliedAt ?? '')
        ) {
            return false;
        }
        if (String((a as { executorScheduleLabel?: string }).executorScheduleLabel ?? '') !==
            String((b as { executorScheduleLabel?: string }).executorScheduleLabel ?? '')) {
            return false;
        }
        if (String((a as { policeAssistanceSavedAt?: string }).policeAssistanceSavedAt ?? '') !==
            String((b as { policeAssistanceSavedAt?: string }).policeAssistanceSavedAt ?? '')) {
            return false;
        }
        if (
            String((a as { specificDeliveryPropertyExpertSavedAt?: string }).specificDeliveryPropertyExpertSavedAt ?? '') !==
            String((b as { specificDeliveryPropertyExpertSavedAt?: string }).specificDeliveryPropertyExpertSavedAt ?? '')
        ) {
            return false;
        }
        if (
            String((a as { specificDeliveryConversionSavedAt?: string }).specificDeliveryConversionSavedAt ?? '') !==
            String((b as { specificDeliveryConversionSavedAt?: string }).specificDeliveryConversionSavedAt ?? '')
        ) {
            return false;
        }
        if (
            String((a as { breakInventoryFurnitureFinalizedAt?: string }).breakInventoryFurnitureFinalizedAt ?? '') !==
            String((b as { breakInventoryFurnitureFinalizedAt?: string }).breakInventoryFurnitureFinalizedAt ?? '')
        ) {
            return false;
        }
        if (
            String((a as { judicialCustodianDetailsSavedAt?: string }).judicialCustodianDetailsSavedAt ?? '') !==
            String((b as { judicialCustodianDetailsSavedAt?: string }).judicialCustodianDetailsSavedAt ?? '')
        ) {
            return false;
        }
    }
    return true;
}

export function useExecutorDecisions(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
) {
    const executionDataRef = React.useRef(executionData);
    executionDataRef.current = executionData;

    const executionDataHintKey = (() => {
        if (!executionData || typeof executionData !== 'object') return '';
        const types = getEffectiveClaimTypes(executionData);
        const single = String(executionData.claimType || '').trim();
        return [
            String(executionData.id || '').trim(),
            String(executionData.parentDossierId || executionData.parentFileId || '').trim(),
            types.length ? types.join('|') : single,
        ].join(':');
    })();

    const resolvedExecutionId = React.useMemo(
        () => resolveExecutorHookExecutionId(executionId, executionDataRef.current),
        [executionId, executionDataHintKey],
    );
    const [rows, setRows] = React.useState<Record<string, unknown>[]>(() =>
        readUnionForExecutorHook(executionId, executionData)
    );

    React.useEffect(() => {
        const sync = () => {
            const next = readUnionForExecutorHook(executionId, executionDataRef.current);
            setRows((prev) => (executorDecisionRowsShallowEqual(prev, next) ? prev : next));
        };
        sync();
        const exId = resolveExecutorHookExecutionId(executionId, executionDataRef.current);
        void warmExecutorDecisionsStorage(exId, executionDataRef.current).then(sync);
        window.addEventListener(DECISIONS_RELOAD_EVENT, sync);
        window.addEventListener('hami-execution-decision-outcome', sync as EventListener);
        window.addEventListener('focus', sync);
        return () => {
            window.removeEventListener(DECISIONS_RELOAD_EVENT, sync);
            window.removeEventListener('hami-execution-decision-outcome', sync as EventListener);
            window.removeEventListener('focus', sync);
        };
    }, [executionId, executionDataHintKey]);

    return { executionId: resolvedExecutionId, decisions: rows };
}

