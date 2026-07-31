import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { flushSync } from 'react-dom';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import {
    openTransactionsFromShell,
    TRANSACTIONS_SHELL_FEATURE,
} from '@/app/services/transactions/transactionsShellNavigation';
/** Matches transactionsBootHydrator.ts — local to avoid sync stem pull. */
const TRANSACTIONS_PRIME_HOST_EVENT = 'hami:transactions-prime-host';

function loadTransactionsBootHydrator() {
    return import('@/app/runtime/transactionsBootHydrator');
}
import type { LawyerArchiveOverlay } from '@/app/hooks/useLawyerExecutionFiles';
import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import { registerDashboardOverlayCloser } from '@/app/hooks/lawyerDashboard/dashboardOverlayCoordinator';
import { useKeepAliveIdleRelease } from '@/app/hooks/lawyerDashboard/useKeepAliveIdleRelease';
import {
    persistTransactionsSessionOpen,
    readInitialTransactionsSession,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import { onDashboardInteractive } from '@/app/bootstrap/bootMetrics';
import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';
import { subscribeOpenTransactionsHub } from '@/app/services/transactions/procedureGuideNavigation';

function loadTransactionsIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/transactionsIntentWarm');
}

function loadTransactionsHubLoader() {
    return import('@/app/runtime/transactionsHubLoader');
}

export type UseLawyerDashboardTransactionsParams = {
    userId: string | null;
    setArchiveType: Dispatch<SetStateAction<LawyerArchiveOverlay>>;
    setShowLawsuitsWorkspace: (open: boolean) => void;
};

export function useLawyerDashboardTransactions({
    userId,
    setArchiveType,
    setShowLawsuitsWorkspace,
}: UseLawyerDashboardTransactionsParams) {
    const [initialSession] = useState(() => readInitialTransactionsSession());
    const [showTransactions, setShowTransactions] = useState(() => initialSession.open);
    const [transactionsHostMounted, setTransactionsHostMounted] = useState(
        () => initialSession.open,
    );
    const [transactionsSessionKey, setTransactionsSessionKey] = useState(0);
    const [transactionsFocusId, setTransactionsFocusId] = useState<string | undefined>();
    const showTransactionsRef = useRef(initialSession.open);
    showTransactionsRef.current = showTransactions;

    const closeTransactionsHub = useCallback(() => {
        showTransactionsRef.current = false;
        flushSync(() => {
            setShowTransactions(false);
            setTransactionsFocusId(undefined);
        });
        persistTransactionsSessionOpen(false);
    }, []);

    const armTransactionsHost = useCallback(() => {
        setTransactionsHostMounted(true);
        void ensureDeferredFeatureStylesLoaded();
        void loadTransactionsIntentWarm().then((m) => m.primeTransactionsShellForOpen());
    }, []);

    const primeTransactionsHubMount = useCallback(() => {
        void loadTransactionsIntentWarm().then((m) => m.warmTransactionsOnHover(userId));
        armTransactionsHost();
    }, [armTransactionsHost, userId]);

    /** ركّب Host مخفياً فور وجود هوية — قبل أول لمسة معاملات (مثل الإعدادات) */
    useLayoutEffect(() => {
        if (!isRealSignedIn(userId)) return;
        armTransactionsHost();
        void loadTransactionsIntentWarm().then((m) => m.warmTransactionsOnHover(userId));
        void loadTransactionsHubLoader().then((m) => m.loadTransactionsHubModule()).catch(() => undefined);
        void import('@/app/modules/transactionsThreading/store')
            .then((m) => m.warmTransactionsThreadingStore(userId))
            .catch(() => undefined);
    }, [armTransactionsHost, userId]);

    useEffect(() => {
        let disposed = false;
        let unsub: (() => void) | undefined;
        void loadTransactionsIntentWarm().then((m) => {
            if (disposed) return;
            unsub = m.registerTransactionsWarmUserId(userId);
        });
        return () => {
            disposed = true;
            unsub?.();
        };
    }, [userId]);

    useEffect(() => {
        let unbind: (() => void) | undefined;
        void loadTransactionsBootHydrator().then((m) => {
            unbind = m.bindTransactionsBootHydrator(userId);
        });
        return () => unbind?.();
    }, [userId]);

    useEffect(() => {
        return registerDashboardOverlayCloser('transactions', () => {
            showTransactionsRef.current = false;
            setShowTransactions(false);
            setTransactionsFocusId(undefined);
            persistTransactionsSessionOpen(false);
        });
    }, []);

    useKeepAliveIdleRelease(showTransactions, () => setTransactionsHostMounted(false));

    useEffect(() => {
        persistTransactionsSessionOpen(showTransactions);
    }, [showTransactions]);

    /** استعادة بعد F5: ثبّت host + سخّن */
    useEffect(() => {
        if (!showTransactions || !isRealSignedIn(userId)) return;
        armTransactionsHost();
        void loadTransactionsIntentWarm().then((m) => m.warmTransactionsOnOpen(userId));
        void loadTransactionsBootHydrator()
            .then((m) => m.hydrateTransactionsBootShellForInstantOpen(userId, true))
            .catch(() => undefined);
        void loadTransactionsHubLoader().then((m) => m.loadTransactionsHubModule()).catch(() => undefined);
    }, [armTransactionsHost, showTransactions, userId]);

    /**
     * بعد dashboard-interactive: تسخين chunk فقط — بلا arm Host
     * (مثل الملف/البحث؛ التركيب عند نية/فتح فقط).
     */
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const scheduleWarm = () => {
        void loadTransactionsIntentWarm().then((m) => m.warmTransactionsOnHover(userId));
        void loadTransactionsBootHydrator()
            .then((m) => m.prefetchTransactionsAfterBootReveal(userId))
            .catch(() => undefined);
        };

        return onDashboardInteractive(scheduleWarm);
    }, [userId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onPrime = () => {
            primeTransactionsHubMount();
            void loadTransactionsBootHydrator()
                .then((m) => m.hydrateTransactionsBootShellForInstantOpen(userId, true))
                .catch(() => undefined);
        };
        window.addEventListener(TRANSACTIONS_PRIME_HOST_EVENT, onPrime);
        return () => window.removeEventListener(TRANSACTIONS_PRIME_HOST_EVENT, onPrime);
    }, [primeTransactionsHubMount, userId]);

    const openTransactionsHub = useCallback(
        (focusId?: string) => {
            openTransactionsFromShell({
                signedIn: isRealSignedIn(userId),
                onSignedOut: () =>
                    SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${TRANSACTIONS_SHELL_FEATURE}`),
                onOpen: () => {
                    if (showTransactionsRef.current) {
                        if (focusId !== undefined) setTransactionsFocusId(focusId);
                        return;
                    }

                    flushSync(() => {
                        armTransactionsHost();
                        if (focusId !== undefined) setTransactionsFocusId(focusId);
                        else setTransactionsFocusId(undefined);
                        showTransactionsRef.current = true;
                        setShowTransactions(true);
                    });
                    persistTransactionsSessionOpen(true);

                    /* مخزن البطاقات مع إطار الفتح — لا تنتظر microtask */
                    if (userId) {
                        void import('@/app/modules/transactionsThreading/store')
                            .then((m) => m.warmTransactionsThreadingStore(userId))
                            .catch(() => undefined);
                    }

                    queueMicrotask(() => {
                        dismissTransientOverlays('transactions');
                        setArchiveType(null);
                        setShowLawsuitsWorkspace(false);
                        void loadTransactionsIntentWarm().then((m) => {
                            m.primeTransactionsShellForOpen();
                            m.warmTransactionsOnOpen(userId);
                        });
                        void loadTransactionsBootHydrator()
                            .then((m) =>
                                m.hydrateTransactionsBootShellForInstantOpen(userId, true),
                            )
                            .catch(() => undefined);
                        void loadTransactionsHubLoader()
                            .then((m) => m.loadTransactionsHubModule())
                            .catch(() => undefined);
                    });
                },
            });
        },
        [armTransactionsHost, setArchiveType, setShowLawsuitsWorkspace, userId],
    );

    useEffect(() => {
        return subscribeOpenTransactionsHub(() => {
            openTransactionsHub();
        });
    }, [openTransactionsHub]);

    const resetTransactionsShell = useCallback(() => {
        setTransactionsSessionKey((k) => k + 1);
        showTransactionsRef.current = false;
        setShowTransactions(false);
        setTransactionsFocusId(undefined);
        persistTransactionsSessionOpen(false);
    }, []);

    return {
        showTransactions,
        transactionsHostMounted,
        setShowTransactions,
        closeTransactionsHub,
        transactionsSessionKey,
        transactionsFocusId,
        setTransactionsFocusId,
        primeTransactionsHubMount,
        resetTransactionsShell,
        openTransactionsHub,
    };
}
