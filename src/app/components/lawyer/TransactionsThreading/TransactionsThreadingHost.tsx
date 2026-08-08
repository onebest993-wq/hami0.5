import React, { useCallback, useLayoutEffect, useState } from 'react';
import { TransactionsHubInstantShell } from '@/app/components/lawyer/TransactionsThreading/TransactionsHubInstantShell';
import {
    getCachedTransactionsThreadingSystem,
    hydrateTransactionsShellForInstantOpen,
    loadTransactionsHubModule,
    type TransactionsThreadingSystemComponent,
    type TransactionsThreadingSystemProps,
} from '@/app/runtime/transactionsHubLoader';
import {
    TRANSACTIONS_SHELL_HYDRATED_EVENT,
} from '@/app/runtime/transactionsBootHydrator';
import { warmTransactionsDiskRead } from '@/app/services/transactions/transactionsDiskWarm';

const LOAD_RETRY_MS = 700;
const MAX_LOAD_ATTEMPTS = 3;

function TransactionsLoadError({ onRetry, onBack }: { onRetry: () => void; onBack: () => void }) {
    return (
        <div
            data-testid="transactions-load-error"
            className="fixed inset-0 z-[200] bg-[#061014]/98 flex flex-col items-center justify-center gap-4 px-6 font-['Tajawal','Cairo',sans-serif]"
            role="alert"
        >
            <p className="text-[#D8D4CE]/85 text-sm font-bold text-center">تعذّر تحميل المعاملات</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                    type="button"
                    data-testid="transactions-load-retry"
                    onClick={onRetry}
                    className="min-h-[44px] rounded-sm border border-[#C4782F]/35 bg-[#152A32] px-4 py-2 text-sm font-bold text-[#D8D4CE] touch-manipulation"
                >
                    إعادة المحاولة
                </button>
                <button
                    type="button"
                    onClick={onBack}
                    className="min-h-[44px] rounded-sm bg-[#1A3340] px-4 py-2 text-sm font-bold text-[#D8D4CE] touch-manipulation"
                >
                    إغلاق
                </button>
            </div>
        </div>
    );
}

/** يحمّل hub المعاملات مرة واحدة — keepAlive يسخّن مخفياً؛ الفتح = InstantShell أو System */
export function TransactionsThreadingHost(props: TransactionsThreadingSystemProps): React.ReactElement | null {
    const { open = true, keepAlive = false, onBack } = props;
    const [Component, setComponent] = useState<TransactionsThreadingSystemComponent | null>(() =>
        getCachedTransactionsThreadingSystem(),
    );
    const [loadFailed, setLoadFailed] = useState(false);
    const [loadGeneration, setLoadGeneration] = useState(0);

    const shouldMount = open || keepAlive;

    const retryLoad = useCallback(() => {
        setLoadFailed(false);
        setLoadGeneration((g) => g + 1);
    }, []);

    /* kick أثناء الرسم إن فُتح/دُفئ بلا كاش */
    if (shouldMount && !Component && typeof window !== 'undefined') {
        void loadTransactionsHubModule().catch(() => undefined);
    }

    useLayoutEffect(() => {
        const cached = getCachedTransactionsThreadingSystem();
        if (cached) {
            setComponent(() => cached);
            setLoadFailed(false);
        }

        let cancelled = false;
        let attempts = 0;

        const adoptModule = () => {
            const hit = getCachedTransactionsThreadingSystem();
            if (hit) {
                setComponent(() => hit);
                setLoadFailed(false);
                return;
            }

            void loadTransactionsHubModule()
                .then((mod) => {
                    if (cancelled) return;
                    if (mod.default) {
                        setComponent(() => mod.default);
                        setLoadFailed(false);
                        return;
                    }
                    throw new Error('TransactionsThreadingSystem missing');
                })
                .catch(() => {
                    if (cancelled) return;
                    attempts += 1;
                    if (attempts < MAX_LOAD_ATTEMPTS) {
                        window.setTimeout(adoptModule, LOAD_RETRY_MS);
                        return;
                    }
                    setLoadFailed(true);
                });
        };

        adoptModule();

        const onHydrated = () => {
            const resolved = getCachedTransactionsThreadingSystem();
            if (resolved) {
                setComponent(() => resolved);
                setLoadFailed(false);
            }
        };
        window.addEventListener(TRANSACTIONS_SHELL_HYDRATED_EVENT, onHydrated);

        return () => {
            cancelled = true;
            window.removeEventListener(TRANSACTIONS_SHELL_HYDRATED_EVENT, onHydrated);
        };
    }, [loadGeneration]);

    useLayoutEffect(() => {
        if (!shouldMount) return;
        warmTransactionsDiskRead(props.userId);
        void hydrateTransactionsShellForInstantOpen();
        void import('@/app/modules/transactionsThreading/store')
            .then((m) => {
                const uid = props.userId?.trim();
                if (uid) return m.warmTransactionsThreadingStore(uid);
                return undefined;
            })
            .catch(() => undefined);
    }, [shouldMount, props.userId]);

    const ResolvedComponent = Component ?? getCachedTransactionsThreadingSystem();

    if (!shouldMount) {
        return null;
    }

    if (ResolvedComponent) {
        /* keepAlive: أبقِ System في DOM مخفياً — الفتح = إظهار بلا InstantShell/remount */
        return <ResolvedComponent {...props} />;
    }

    if (loadFailed) {
        return <TransactionsLoadError onRetry={retryLoad} onBack={onBack} />;
    }

    if (open) {
        return <TransactionsHubInstantShell onBack={onBack} />;
    }

    return null;
}
