import type { DeferredFeatureBag } from '@/app/components/lawyer/dashboard/LawyerDashboardDeferredFeatureSurfaces.types';

/** بصمة حقول الواجهة فقط — لتجنب حلقة onReady → setState → render */
export function deferredFeatureBagFingerprint(bag: DeferredFeatureBag): string {
    const t = bag.transactions;
    const r = bag.repository;
    const p = bag.profile;
    const f = bag.fieldTasks;
    const sch = bag.schedule;
    const g = bag.globalSearch;
    return [
        t.showTransactions,
        t.transactionsHostMounted,
        t.transactionsSessionKey,
        t.transactionsFocusId ?? '',
        r.isRepositoryOpen,
        r.repositoryHostMounted,
        r.repositorySessionKey,
        r.repositoryTab,
        r.vaultOpenScanner,
        p.profileHostMounted,
        p.profileTabSessionKey,
        p.profileOpenEpoch,
        f.fieldTasksSheetOpen,
        f.fieldTasksHostMounted,
        f.showTasksManager,
        f.fieldTasksManagerHostMounted,
        f.fieldTasksSheetSessionKey,
        f.tasksManagerSessionKey,
        f.tasksManagerFocusTaskId ?? '',
        sch.scheduleHostMounted,
        sch.scheduleTabSessionKey,
        String(sch.calendarSearchFocus ?? ''),
        g.showGlobalSearch,
        g.searchHostMounted,
        g.globalSearchSessionKey,
        g.globalSearchInitialQuery,
        g.searchIndexVersion,
    ].join('|');
}
