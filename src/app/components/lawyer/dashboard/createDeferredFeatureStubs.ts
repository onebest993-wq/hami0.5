import type {
    DeferredFeatureBag,
    DeferredPendingOp,
} from '@/app/components/lawyer/dashboard/LawyerDashboardDeferredFeatureSurfaces.types';

const noop = () => undefined;

/** stubs خفيفة قبل تسليح الجزيرة — تفتح عبر requestArm ثم تُنفَّذ عند onReady */
export function createDeferredFeatureStubs(
    requestArm: (op: DeferredPendingOp) => void,
): DeferredFeatureBag {
    const transactions = {
        showTransactions: false,
        transactionsHostMounted: false,
        setShowTransactions: noop as DeferredFeatureBag['transactions']['setShowTransactions'],
        closeTransactionsHub: noop,
        transactionsSessionKey: 0,
        transactionsFocusId: undefined as string | undefined,
        setTransactionsFocusId: noop as DeferredFeatureBag['transactions']['setTransactionsFocusId'],
        primeTransactionsHubMount: () => requestArm('transactions'),
        resetTransactionsShell: noop,
        openTransactionsHub: (_focusId?: string) => requestArm('transactions'),
    } satisfies DeferredFeatureBag['transactions'];

    const profile = {
        profileTabSessionKey: 0,
        profileOpenEpoch: 0,
        profileHostMounted: false,
        profileShellReady: false,
        profileShellWarming: false,
        primeProfileTabMount: () => requestArm('profile'),
        resetProfileTabShell: noop,
        openProfileTab: () => requestArm('profile'),
        closeProfileTab: noop,
    } satisfies DeferredFeatureBag['profile'];

    const fieldTasks = {
        fieldTasksSheetSessionKey: 0,
        fieldTasksHostMounted: false,
        fieldTasksManagerHostMounted: false,
        fieldTasksSheetOpen: false,
        showTasksManager: false,
        tasksManagerFocusTaskId: undefined as string | undefined,
        tasksManagerSessionKey: 0,
        primeFieldTasksShellMount: () => requestArm('fieldTasks'),
        resetFieldTasksShell: noop,
        openFieldTasksSheet: () => requestArm('fieldTasks'),
        openTasksManager: () => requestArm('tasksManager'),
        switchToTasksManager: noop,
        closeFieldTasksSheet: noop,
        closeTasksManager: noop,
    } satisfies DeferredFeatureBag['fieldTasks'];

    const globalSearch = {
        showGlobalSearch: false,
        setShowGlobalSearch: noop as DeferredFeatureBag['globalSearch']['setShowGlobalSearch'],
        searchHostMounted: false,
        globalSearchInitialQuery: '',
        setGlobalSearchInitialQuery:
            noop as DeferredFeatureBag['globalSearch']['setGlobalSearchInitialQuery'],
        globalSearchSessionKey: 0,
        primeGlobalSearchShellMount: () => requestArm('globalSearch'),
        searchIndexVersion: 0,
        setSearchIndexVersion: noop as DeferredFeatureBag['globalSearch']['setSearchIndexVersion'],
        bumpSearchIndex: noop,
        resetGlobalSearchShell: noop,
        openGlobalSearch: (_seed = '') => requestArm('globalSearch'),
        closeGlobalSearch: noop,
    } satisfies DeferredFeatureBag['globalSearch'];

    const globalSearchNav = {
        handleGlobalSearchNavigate: noop,
        closeGlobalSearch: noop,
    } as unknown as DeferredFeatureBag['globalSearchNav'];

    return {
        transactions,
        profile,
        fieldTasks,
        globalSearch,
        globalSearchNav,
    };
}

export function runDeferredPendingOp(bag: DeferredFeatureBag, op: DeferredPendingOp): void {
    if (!op) return;
    if (op === 'transactions') bag.transactions.openTransactionsHub();
    else if (op === 'profile') bag.profile.openProfileTab();
    else if (op === 'fieldTasks') bag.fieldTasks.openFieldTasksSheet();
    else if (op === 'tasksManager') bag.fieldTasks.openTasksManager();
    else if (op === 'globalSearch') bag.globalSearch.openGlobalSearch();
}
