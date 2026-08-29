import type { DeferredFeatureBag } from '@/app/components/lawyer/dashboard/LawyerDashboardDeferredFeatureSurfaces.types';

/** بصمة حقول الواجهة فقط — لتجنب حلقة onReady → setState → render */
export function deferredFeatureBagFingerprint(bag: DeferredFeatureBag): string {
    const t = bag.transactions;
    const f = bag.fieldTasks;
    const g = bag.globalSearch;
    return [
        t.showTransactions,
        t.transactionsSessionKey,
        t.transactionsFocusId ?? '',
        f.fieldTasksSheetOpen,
        f.fieldTasksHostMounted,
        f.showTasksManager,
        f.fieldTasksManagerHostMounted,
        f.fieldTasksSheetSessionKey,
        f.tasksManagerSessionKey,
        f.tasksManagerFocusTaskId ?? '',
        g.showGlobalSearch,
        g.searchHostMounted,
        g.globalSearchSessionKey,
        g.globalSearchInitialQuery,
        g.searchIndexVersion,
    ].join('|');
}
