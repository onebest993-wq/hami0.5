import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { flushSync } from 'react-dom';

import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    beginTransactionsShellExit,
    clearTransactionsShellClosing,
} from '@/app/hooks/lawyerDashboard/transactions/transactionsShellExit';
import { executeTransactionsOverlayClose } from '@/app/runtime/overlaySnapClose';
import { hasLocalAppSession } from '@/app/services/auth/shellAuth';
import {
    openTransactionsFromShell,
    TRANSACTIONS_SHELL_FEATURE,
} from '@/app/services/transactions/transactionsShellNavigation';
import {
    snapTransactionsShellClose,
    snapTransactionsShellOpen,
    isTransactionsShellSnappedOpen,
} from '@/app/services/transactions/transactionsShellSnap';
import {
    clearTransactionsEnterSettle,
    paintTransactionsInstantChrome,
} from '@/app/runtime/transactionsInstantPaint';
import type { LawyerArchiveOverlay } from '@/app/hooks/useLawyerExecutionFiles';
import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import { registerDashboardOverlayCloser } from '@/app/hooks/lawyerDashboard/dashboardOverlayCoordinator';
import { deferShellConcealAfterHandoff, isShellHandoffPending } from '@/app/runtime/sectionShellHandoff';
import {
    persistTransactionsSessionOpen,
    readInitialTransactionsSession,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import { onDashboardInteractive } from '@/app/bootstrap/bootMetrics';
import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';
import { subscribeOpenTransactionsHub } from '@/app/services/transactions/procedureGuideNavigation';
import { warmTransactionsDiskRead } from '@/app/services/transactions/transactionsDiskWarm';
import { blurFocusWithin } from '@/app/utils/inertProps';

/** Matches transactionsBootHydrator.ts — local to avoid sync stem pull. */
const TRANSACTIONS_PRIME_HOST_EVENT = 'hami:transactions-prime-host';

function loadTransactionsBootHydrator() {
    return import('@/app/runtime/transactionsBootHydrator');
}

function loadTransactionsIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/transactionsIntentWarm');
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
    const [transactionsSessionKey, setTransactionsSessionKey] = useState(0);
    const [transactionsFocusId, setTransactionsFocusId] = useState<string | undefined>();
    const showTransactionsRef = useRef(initialSession.open);
    const closingRef = useRef(false);
    showTransactionsRef.current = showTransactions;

    const closeTransactionsHub = useCallback(() => {
        if (closingRef.current) return;
        closingRef.current = true;
        beginTransactionsShellExit(() => {
            showTransactionsRef.current = false;
            executeTransactionsOverlayClose({
                conceal: () => {
                    if (typeof document !== 'undefined') {
                        const hub = document.querySelector('[data-testid="transactions-hub"]');
                        blurFocusWithin(hub instanceof HTMLElement ? hub : null);
                    }
                    snapTransactionsShellClose();
                },
                commit: () => {
                    flushSync(() => {
                        setShowTransactions(false);
                        setTransactionsFocusId(undefined);
                        persistTransactionsSessionOpen(false);
                    });
                    closingRef.current = false;
                },
            });
        });
    }, []);

    const warmTransactionsPrimeChain = useCallback(() => {
        void ensureDeferredFeatureStylesLoaded();
        void loadTransactionsIntentWarm().then((m) => m.primeTransactionsShellForOpen(userId));
    }, [userId]);

    /** لمسة البلاطة: قرص + مقطع — بلا تركيب Host حتى الفتح */
    const primeTransactionsHubMount = useCallback(() => {
        warmTransactionsDiskRead(userId);
        warmTransactionsPrimeChain();
    }, [userId, warmTransactionsPrimeChain]);

    /** تسخين القرص فور وجود هوية — بلا تركيب Host حتى اللمسة أو الفتح */
    useLayoutEffect(() => {
        const uid = userId?.trim();
        if (!uid || !hasLocalAppSession(uid)) return;
        warmTransactionsDiskRead(uid);
    }, [userId]);

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
        return registerDashboardOverlayCloser('transactions', closeTransactionsHub);
    }, [closeTransactionsHub]);

    useLayoutEffect(() => {
        if (showTransactions) {
            snapTransactionsShellOpen();
            return;
        }
        return deferShellConcealAfterHandoff(() => {
            if (isShellHandoffPending('transactions') || showTransactionsRef.current) return;
            if (isTransactionsShellSnappedOpen()) {
                snapTransactionsShellClose();
            }
        });
    }, [showTransactions]);

    /** بلا جلسة محلية — أغلق المركز ولا تُبقِ Host دافئاً */
    useEffect(() => {
        if (hasLocalAppSession(userId)) return;
        closingRef.current = false;
        clearTransactionsEnterSettle();
        clearTransactionsShellClosing();
        showTransactionsRef.current = false;
        snapTransactionsShellClose();
        setShowTransactions(false);
        setTransactionsFocusId(undefined);
        persistTransactionsSessionOpen(false);
    }, [userId]);

    /**
     * بعد dashboard-interactive: تسخين chunk فقط — بلا arm Host
     */
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const scheduleWarm = () => {
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
        };
        window.addEventListener(TRANSACTIONS_PRIME_HOST_EVENT, onPrime);
        return () => window.removeEventListener(TRANSACTIONS_PRIME_HOST_EVENT, onPrime);
    }, [primeTransactionsHubMount]);

    const openTransactionsHub = useCallback(
        (focusId?: string) => {
            openTransactionsFromShell({
                signedIn: hasLocalAppSession(userId),
                onSignedOut: () =>
                    SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${TRANSACTIONS_SHELL_FEATURE}`),
                onOpen: () => {
                    if (closingRef.current) {
                        closingRef.current = false;
                        clearTransactionsShellClosing();
                        if (focusId !== undefined) setTransactionsFocusId(focusId);
                        else setTransactionsFocusId(undefined);
                        paintTransactionsInstantChrome();
                        persistTransactionsSessionOpen(true);
                        return;
                    }

                    if (showTransactionsRef.current) {
                        if (focusId !== undefined) setTransactionsFocusId(focusId);
                        else setTransactionsFocusId(undefined);
                        return;
                    }

                    closingRef.current = false;
                    clearTransactionsShellClosing();
                    warmTransactionsDiskRead(userId);
                    paintTransactionsInstantChrome();
                    flushSync(() => {
                        warmTransactionsPrimeChain();
                        if (focusId !== undefined) setTransactionsFocusId(focusId);
                        else setTransactionsFocusId(undefined);
                        showTransactionsRef.current = true;
                        setShowTransactions(true);
                    });
                    persistTransactionsSessionOpen(true);

                    queueMicrotask(() => {
                        dismissTransientOverlays('transactions');
                        setArchiveType(null);
                        setShowLawsuitsWorkspace(false);
                        void loadTransactionsIntentWarm().then((m) => {
                            m.warmTransactionsOnOpen(userId);
                        });
                    });
                },
            });
        },
        [setArchiveType, setShowLawsuitsWorkspace, userId, warmTransactionsPrimeChain],
    );

    useEffect(() => {
        return subscribeOpenTransactionsHub(() => {
            openTransactionsHub();
        });
    }, [openTransactionsHub]);

    const resetTransactionsShell = useCallback(() => {
        closingRef.current = false;
        clearTransactionsEnterSettle();
        clearTransactionsShellClosing();
        setTransactionsSessionKey((k) => k + 1);
        showTransactionsRef.current = false;
        snapTransactionsShellClose();
        setShowTransactions(false);
        setTransactionsFocusId(undefined);
        persistTransactionsSessionOpen(false);
    }, []);

    return {
        showTransactions,
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
