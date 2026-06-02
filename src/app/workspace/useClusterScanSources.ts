import { useEffect, useState } from 'react';
import { UrgentActionsDB } from '@/app/services/urgent-actions-db';
import { TransactionsThreadingDB } from '@/app/services/lawyer-cloud';

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

/** مصادر مسح الربط العنقودي — دعاوى + تنفيذ + جزائي + مستعجل + إداري + مفكرة + مهام */
export function useClusterScanSources(params: {
    lawyerId: string | null;
    lawsuitFiles: unknown[];
    executionFiles: unknown[];
    criminalCases?: unknown[];
    notes?: unknown[];
    fieldTasks?: unknown[];
}): ClusterScanSources {
    const {
        lawyerId,
        lawsuitFiles,
        executionFiles,
        criminalCases: criminalCasesParam = [],
        notes = [],
        fieldTasks = [],
    } = params;

    const [urgentCases, setUrgentCases] = useState<unknown[]>([]);
    const [threadingTransactions, setThreadingTransactions] = useState<unknown[]>([]);
    const [extrasReady, setExtrasReady] = useState(false);

    const criminalCases = criminalCasesParam;

    useEffect(() => {
        if (!lawyerId) {
            setUrgentCases([]);
            setThreadingTransactions([]);
            setExtrasReady(true);
            return;
        }
        let cancelled = false;
        setExtrasReady(false);
        void Promise.all([UrgentActionsDB.getState(lawyerId), TransactionsThreadingDB.getState(lawyerId)])
            .then(([urgentState, threadingState]) => {
                if (cancelled) return;
                setUrgentCases(Array.isArray(urgentState?.cases) ? urgentState.cases : []);
                setThreadingTransactions(
                    Array.isArray(threadingState?.transactions) ? threadingState.transactions : [],
                );
            })
            .catch(() => {
                if (!cancelled) {
                    setUrgentCases([]);
                    setThreadingTransactions([]);
                }
            })
            .finally(() => {
                if (!cancelled) setExtrasReady(true);
            });
        return () => {
            cancelled = true;
        };
    }, [lawyerId]);

    return {
        lawsuitFiles,
        executionFiles,
        criminalCases,
        urgentCases,
        threadingTransactions,
        notes,
        fieldTasks,
        ready: extrasReady,
    };
}
