/** prefetch الأرشيف عند hover — خارج chrome حتى لا يكسر Fast Refresh للبلاطات */
export function bindArchivePrefetch(archiveId: string, interactionDisabled: boolean) {
    if (interactionDisabled) {
        return { onPointerEnter: undefined, onPointerDown: undefined, onFocus: undefined };
    }
    const run = () => {
        void import('@/app/hooks/lawyerDashboard/dockShellPrefetchGate')
            .then((m) => m.armHeavyDockWidgetsIdlePrefetch())
            .catch(() => undefined);
        void import('@/app/hooks/lawyerDashboard/hubArchivePrefetchGate')
            .then((m) => m.prefetchHubArchiveIntentDebounced(archiveId))
            .catch(() => undefined);
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
        void import('@/app/hooks/lawyerDashboard/dockShellPrefetchGate')
            .then((m) => m.armHeavyDockWidgetsIdlePrefetch())
            .catch(() => undefined);
        void import('@/app/hooks/lawyerDashboard/hubArchivePrefetchGate')
            .then((m) => m.prefetchHubArchiveIntentImmediate(archiveId))
            .catch(() => undefined);
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
