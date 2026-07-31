import { useEffect, useMemo, useState } from 'react';
import { UrgentActionsDB } from '@/app/services/urgent-actions-db';
import { TransactionsThreadingDB } from '@/app/services/cloud/lawyerTransactionsCloud';

export type ClusterScanSources = {
    lawsuitFiles: unknown[];
    executionFiles: unknown[];
    criminalCases: unknown[];
    urgentCases: unknown[];
    threadingTransactions: unknown[];
    notes: unknown[];
    fieldTasks: unknown[];
    ready: boolean;
};

const EMPTY_LIST: unknown[] = [];

/** مصادر مسح الربط العنقودي — دعاوى + تنفيذ + جزائي + مستعجل + إداري + مفكرة + مهام */
export function useClusterScanSources(params: {
    enabled: boolean;
    lawyerId: string | null;
    lawsuitFiles: unknown[];
    executionFiles: unknown[];
    criminalCases?: unknown[];
    notes?: unknown[];
    fieldTasks?: unknown[];
}): ClusterScanSources {
    const {
        enabled,
        lawyerId,
        lawsuitFiles,
        executionFiles,
        criminalCases: criminalCasesParam,
        notes: notesParam,
        fieldTasks: fieldTasksParam,
    } = params;

    const criminalCases = criminalCasesParam ?? EMPTY_LIST;
    const notes = notesParam ?? EMPTY_LIST;
    const fieldTasks = fieldTasksParam ?? EMPTY_LIST;

    const [urgentCases, setUrgentCases] = useState<unknown[]>(EMPTY_LIST);
    const [threadingTransactions, setThreadingTransactions] = useState<unknown[]>(EMPTY_LIST);
    const [extrasReady, setExtrasReady] = useState(false);

    useEffect(() => {
        if (!enabled) {
            setUrgentCases(EMPTY_LIST);
            setThreadingTransactions(EMPTY_LIST);
            setExtrasReady(false);
            return;
        }
        if (!lawyerId) {
            setUrgentCases(EMPTY_LIST);
            setThreadingTransactions(EMPTY_LIST);
            setExtrasReady(true);
            return;
        }
        let cancelled = false;
        setExtrasReady(false);
        void Promise.all([UrgentActionsDB.getState(lawyerId), TransactionsThreadingDB.getState(lawyerId)])
            .then(([urgentState, threadingState]) => {
                if (cancelled) return;
                setUrgentCases(Array.isArray(urgentState?.cases) ? urgentState.cases : EMPTY_LIST);
                setThreadingTransactions(
                    Array.isArray(threadingState?.transactions)
                        ? threadingState.transactions
                        : EMPTY_LIST,
                );
            })
            .catch(() => {
                if (!cancelled) {
                    setUrgentCases(EMPTY_LIST);
                    setThreadingTransactions(EMPTY_LIST);
                }
            })
            .finally(() => {
                if (!cancelled) setExtrasReady(true);
            });
        return () => {
            cancelled = true;
        };
    }, [enabled, lawyerId]);

    // مرجع مستقر — يمنع setState في الأب في حلقة Maximum update depth
    return useMemo(
        () => ({
            lawsuitFiles,
            executionFiles,
            criminalCases,
            urgentCases,
            threadingTransactions,
            notes,
            fieldTasks,
            ready: extrasReady,
        }),
        [
            lawsuitFiles,
            executionFiles,
            criminalCases,
            urgentCases,
            threadingTransactions,
            notes,
            fieldTasks,
            extrasReady,
        ],
    );
}
