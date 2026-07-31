import React, { useCallback, useLayoutEffect, useState } from 'react';
import { TransactionsHubInstantShell } from '@/app/components/lawyer/TransactionsThreading/TransactionsHubInstantShell';
import {
    getCachedTransactionsThreadingSystem,
    hydrateTransactionsShellForInstantOpen,
    loadTransactionsHubModule,
    type TransactionsThreadingSystemComponent,
    type TransactionsThreadingSystemProps,
} from '@/app/runtime/transactionsHubLoader';

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

    const retryLoad = useCallback(() => {
        setLoadFailed(false);
        setLoadGeneration((g) => g + 1);
    }, []);

    /* kick أثناء الرسم إن فُتح/دُفئ بلا كاش */
    if ((open || keepAlive) && !Component && typeof window !== 'undefined') {
        void loadTransactionsHubModule().catch(() => undefined);
    }

    useLayoutEffect(() => {
        if (!open && !keepAlive) return;

        const cached = getCachedTransactionsThreadingSystem();
        if (cached) {
            setComponent(() => cached);
            setLoadFailed(false);
        }

        let cancelled = false;
        let attempts = 0;

        const adoptModule = () => {
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

        return () => {
            cancelled = true;
        };
    }, [open, keepAlive, loadGeneration]);

    useLayoutEffect(() => {
        if (!open && !keepAlive) return;
        void hydrateTransactionsShellForInstantOpen();
        void import('@/app/modules/transactionsThreading/store')
            .then((m) => {
                const uid = props.userId?.trim();
                if (uid) return m.warmTransactionsThreadingStore(uid);
                return undefined;
            })
            .catch(() => undefined);
    }, [open, keepAlive, props.userId]);

    if (!open && !keepAlive) {
        return null;
    }

    if (Component) {
        /* keepAlive: أبقِ System في DOM مخفياً — الفتح = إظهار بلا InstantShell/remount */
        return <Component {...props} />;
    }

    /* تسخين صامت — بلا InstantShell فوق اللوحة */
    if (!open) {
        return null;
    }

    if (loadFailed) {
        return <TransactionsLoadError onRetry={retryLoad} onBack={onBack} />;
    }

    return <TransactionsHubInstantShell onBack={onBack} />;
}
