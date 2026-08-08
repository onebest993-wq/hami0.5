import { useEffect, useMemo, useState } from 'react';
import { UrgentActionsDB } from '@/app/services/urgent-actions-db';
import { TransactionsThreadingDB } from '@/app/services/cloud/lawyerTransactionsCloud';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

export type { ClusterScanSources };

const EMPTY_LIST: unknown[] = [];
const EMPTY_VAULT: SmartVaultDoc[] = [];
const EMPTY_CALENDAR: UnifiedEvent[] = [];

/** مصادر مسح الربط العنقودي — دعاوى + تنفيذ + جزائي + مستعجل + إداري + مفكرة + مهام + خزنة + تقويم */
export function useClusterScanSources(params: {
    enabled: boolean;
    lawyerId: string | null;
    lawsuitFiles: unknown[];
    executionFiles: unknown[];
    criminalCases?: unknown[];
    notes?: unknown[];
    fieldTasks?: unknown[];
    vaultDocs?: SmartVaultDoc[];
    calendarEvents?: UnifiedEvent[];
}): ClusterScanSources {
    const {
        enabled,
        lawyerId,
        lawsuitFiles,
        executionFiles,
        criminalCases: criminalCasesParam,
        notes: notesParam,
        fieldTasks: fieldTasksParam,
        vaultDocs: vaultDocsParam,
    } = params;

    const criminalCases = criminalCasesParam ?? EMPTY_LIST;
    const notes = notesParam ?? EMPTY_LIST;
    const fieldTasks = fieldTasksParam ?? EMPTY_LIST;
    const vaultDocs = vaultDocsParam ?? EMPTY_VAULT;
    const calendarEvents = params.calendarEvents ?? EMPTY_CALENDAR;

    const [urgentCases, setUrgentCases] = useState<unknown[]>(EMPTY_LIST);
    const [threadingTransactions, setThreadingTransactions] = useState<unknown[]>(EMPTY_LIST);
    const [threadingTasks, setThreadingTasks] = useState<unknown[]>(EMPTY_LIST);
    const [extrasReady, setExtrasReady] = useState(false);

    useEffect(() => {
        if (!enabled) {
            setUrgentCases(EMPTY_LIST);
            setThreadingTransactions(EMPTY_LIST);
            setThreadingTasks(EMPTY_LIST);
            setExtrasReady(false);
            return;
        }
        if (!lawyerId) {
            setUrgentCases(EMPTY_LIST);
            setThreadingTransactions(EMPTY_LIST);
            setThreadingTasks(EMPTY_LIST);
            setExtrasReady(true);
            return;
        }
        let cancelled = false;
        // لا نُعيد ready=false أثناء التحديث — يمنع اختفاء تنبيهات سبارك/الرئيسية لحظياً
        void Promise.all([UrgentActionsDB.getState(lawyerId), TransactionsThreadingDB.getState(lawyerId)])
            .then(([urgentState, threadingState]) => {
                if (cancelled) return;
                setUrgentCases(Array.isArray(urgentState?.cases) ? urgentState.cases : EMPTY_LIST);
                setThreadingTransactions(
                    Array.isArray(threadingState?.transactions)
                        ? threadingState.transactions
                        : EMPTY_LIST,
                );
                setThreadingTasks(
                    Array.isArray(threadingState?.tasks) ? threadingState.tasks : EMPTY_LIST,
                );
            })
            .catch(() => {
                if (!cancelled) {
                    setUrgentCases(EMPTY_LIST);
                    setThreadingTransactions(EMPTY_LIST);
                    setThreadingTasks(EMPTY_LIST);
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
            threadingTasks,
            notes,
            fieldTasks,
            vaultDocs,
            calendarEvents,
            ready: extrasReady,
        }),
        [
            lawsuitFiles,
            executionFiles,
            criminalCases,
            urgentCases,
            threadingTransactions,
            threadingTasks,
            notes,
            fieldTasks,
            vaultDocs,
            calendarEvents,
            extrasReady,
        ],
    );
}
