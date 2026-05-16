import * as React from 'react';
import { DECISIONS_RELOAD_EVENT, readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';

export function useExecutorDecisions(executionId: string | undefined) {
    const exId = String(executionId || '').trim();
    const [rows, setRows] = React.useState<Record<string, unknown>[]>(() => readExecutorDecisionsArray(exId));

    React.useEffect(() => {
        const sync = () => setRows(readExecutorDecisionsArray(exId));
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

