import { armHeavyDockWidgetsIdlePrefetch } from '@/app/hooks/lawyerDashboard/dockShellPrefetchGate';
import {
    prefetchHubArchiveIntentDebounced,
    prefetchHubArchiveIntentImmediate,
} from '@/app/hooks/lawyerDashboard/hubArchivePrefetchGate';

/** prefetch الأرشيف عند hover — خارج chrome حتى لا يكسر Fast Refresh للبلاطات */
export function bindArchivePrefetch(archiveId: string, interactionDisabled: boolean) {
    if (interactionDisabled) {
        return { onPointerEnter: undefined, onPointerDown: undefined, onFocus: undefined };
    }
    const run = () => {
        armHeavyDockWidgetsIdlePrefetch();
        prefetchHubArchiveIntentDebounced(archiveId);
        if (archiveId === 'transaction') {
            void import('@/app/runtime/transactionsBootHydrator')
                .then((m) => m.dispatchTransactionsPrimeHost())
                .catch(() => undefined);
        }
        if (archiveId === 'execution') {
            void import('@/app/runtime/executionArchivePrimeHost')
                .then((m) => m.dispatchExecutionArchivePrimeHost())
                .catch(() => undefined);
        }
    };
    const runPress = () => {
        armHeavyDockWidgetsIdlePrefetch();
        prefetchHubArchiveIntentImmediate(archiveId);
        if (archiveId === 'transaction') {
            void import('@/app/runtime/transactionsBootHydrator')
                .then((m) => m.dispatchTransactionsPrimeHost())
                .catch(() => undefined);
        }
        if (archiveId === 'execution') {
            void import('@/app/runtime/executionArchivePrimeHost')
                .then((m) => m.dispatchExecutionArchivePrimeHost())
                .catch(() => undefined);
        }
    };
    return { onPointerEnter: run, onPointerDown: runPress, onFocus: run };
}
