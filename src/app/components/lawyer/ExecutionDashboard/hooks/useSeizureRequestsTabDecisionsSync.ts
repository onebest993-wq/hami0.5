import React from 'react';
import { DECISIONS_RELOAD_EVENT } from '@/app/utils/executorDecisionContracts';
import { readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';
import { decisionRowId, decisionRowStamp } from './useSeizureRequestsTabDecisions.types';

export function useSeizureRequestsTabDecisionsSync(executionIdsForDecisions: string[]) {
    const readAllDecisions = React.useCallback((): Record<string, unknown>[] => {
        const merged: Record<string, unknown>[] = [];
        for (const id of executionIdsForDecisions) {
            merged.push(...readExecutorDecisionsArray(id));
        }
        const byId = new Map<string, Record<string, unknown>>();
        for (const row of merged) {
            const rid = decisionRowId(row);
            if (!rid) continue;
            const prev = byId.get(rid);
            if (!prev) {
                byId.set(rid, row);
                continue;
            }
            const a = decisionRowStamp(prev);
            const b = decisionRowStamp(row);
            if (b.localeCompare(a, undefined, { numeric: true }) > 0) byId.set(rid, row);
        }
        return Array.from(byId.values());
    }, [executionIdsForDecisions]);

    const [decisions, setDecisions] = React.useState<Record<string, unknown>[]>(() => readAllDecisions());
    React.useEffect(() => {
        const sync = () => setDecisions(readAllDecisions());
        sync();
        window.addEventListener(DECISIONS_RELOAD_EVENT, sync);
        window.addEventListener('hami-execution-decision-outcome', sync as EventListener);
        window.addEventListener('focus', sync);
        return () => {
            window.removeEventListener(DECISIONS_RELOAD_EVENT, sync);
            window.removeEventListener('hami-execution-decision-outcome', sync as EventListener);
            window.removeEventListener('focus', sync);
        };
    }, [readAllDecisions]);

    return decisions;
}
