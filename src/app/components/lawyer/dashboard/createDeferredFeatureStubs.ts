import type {
    DeferredFeatureBag,
    DeferredPendingOp,
} from '@/app/components/lawyer/dashboard/LawyerDashboardDeferredFeatureSurfaces.types';
import { snapTransactionsShellOpen } from '@/app/services/transactions/transactionsShellSnap';
import {
    snapFieldTasksShellOpen,
    snapTasksManagerShellOpen,
} from '@/app/services/fieldTasks/fieldTasksShellSnap';
import { snapGlobalSearchShellOpen } from '@/app/services/search/globalSearchShellSnap';
import {
    paintFieldTasksInstantChrome,
    suppressFieldTasksClose,
} from '@/app/runtime/fieldTasksInstantPaint';
import { loadFieldTasksSheetModule } from '@/app/runtime/fieldTasksHubLoader';

const noop = () => undefined;

export function isFieldTasksDeferredOp(
    op: DeferredPendingOp,
): op is 'fieldTasks' | 'tasksManager' {
    return op === 'fieldTasks' || op === 'tasksManager';
}

/** stubs خفيفة قبل تسليح الجزيرة — تفتح عبر requestArm ثم تُنفَّذ عند onReady */
export function createDeferredFeatureStubs(
    requestArm: (op: DeferredPendingOp) => void,
): DeferredFeatureBag {
    const transactions = {
        showTransactions: false,
        setShowTransactions: noop as DeferredFeatureBag['transactions']['setShowTransactions'],
        closeTransactionsHub: noop,
        transactionsSessionKey: 0,
        transactionsFocusId: undefined as string | undefined,
        setTransactionsFocusId: noop as DeferredFeatureBag['transactions']['setTransactionsFocusId'],
        primeTransactionsHubMount: () => requestArm('transactions'),
        resetTransactionsShell: noop,
        openTransactionsHub: (_focusId?: string) => {
            snapTransactionsShellOpen();
            requestArm('transactions');
        },
    } satisfies DeferredFeatureBag['transactions'];

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
        openFieldTasksSheet: () => {
            suppressFieldTasksClose();
            paintFieldTasksInstantChrome();
            snapFieldTasksShellOpen();
            void loadFieldTasksSheetModule().catch(() => undefined);
            void import(
                '@/app/components/lawyer/dashboard/LawyerDashboardFieldTasksFeatureSurfaces'
            ).catch(() => undefined);
            requestArm('fieldTasks');
        },
        openTasksManager: () => {
            snapTasksManagerShellOpen();
            void import('@/app/services/tasks/quantumTaskCreateLoad')
                .then((m) => m.loadQuantumTaskCreateBundle())
                .catch(() => undefined);
            requestArm('tasksManager');
        },
        switchToTasksManager: noop,
        closeFieldTasksSheet: noop,
        closeTasksManager: noop,
    } satisfies DeferredFeatureBag['fieldTasks'];

    const globalSearch = {
        showGlobalSearch: false,
        searchHostMounted: false,
        globalSearchInitialQuery: '',
        globalSearchSessionKey: 0,
        primeGlobalSearchShellMount: () => requestArm('globalSearch'),
        searchIndexVersion: 0,
        bumpSearchIndex: noop,
        openGlobalSearch: (_seed = '') => {
            snapGlobalSearchShellOpen();
            requestArm('globalSearch');
        },
        closeGlobalSearch: noop,
    } satisfies DeferredFeatureBag['globalSearch'];

    const globalSearchNav = {
        handleGlobalSearchNavigate: noop,
        closeGlobalSearch: noop,
    } as unknown as DeferredFeatureBag['globalSearchNav'];

    return {
        transactions,
        fieldTasks,
        globalSearch,
        globalSearchNav,
    };
}

export function runDeferredPendingOp(bag: DeferredFeatureBag, op: DeferredPendingOp): void {
    if (!op) return;
    if (op === 'transactions') bag.transactions.openTransactionsHub();
    else if (op === 'fieldTasks') bag.fieldTasks.openFieldTasksSheet();
    else if (op === 'tasksManager') bag.fieldTasks.openTasksManager();
    else if (op === 'globalSearch') bag.globalSearch.openGlobalSearch();
}

export function deferredHandoffId(op: Exclude<DeferredPendingOp, null>): string {
    if (op === 'fieldTasks') return 'field-tasks';
    if (op === 'tasksManager') return 'tasks-manager';
    if (op === 'globalSearch') return 'global-search';
    return op;
}

export function isDeferredPendingOpSatisfied(bag: DeferredFeatureBag, op: DeferredPendingOp): boolean {
    if (!op) return true;
    if (op === 'transactions') return bag.transactions.showTransactions;
    if (op === 'fieldTasks') return bag.fieldTasks.fieldTasksSheetOpen;
    if (op === 'tasksManager') return bag.fieldTasks.showTasksManager;
    if (op === 'globalSearch') return bag.globalSearch.showGlobalSearch;
    return false;
}
