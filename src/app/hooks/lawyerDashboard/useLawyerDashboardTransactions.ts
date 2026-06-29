import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import {
    openTransactionsFromShell,
    TRANSACTIONS_SHELL_FEATURE,
} from '@/app/services/transactions/transactionsShellNavigation';
import {
    registerTransactionsWarmUserId,
    warmTransactionsOnHover,
    warmTransactionsOnOpen,
} from '@/app/hooks/lawyerDashboard/transactionsIntentWarm';
import { loadTransactionsHubModule } from '@/app/runtime/transactionsHubLoader';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import type { LawyerArchiveOverlay } from '@/app/hooks/useLawyerExecutionFiles';
import {
    dismissTransientOverlays,
    HAMI_DISMISS_OVERLAYS_EVENT,
    releaseBodyScrollLock,
    type TransientOverlayId,
} from '@/app/utils/bodyScrollLock';

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
    const [showTransactions, setShowTransactions] = useState(false);
    const [transactionsSessionKey, setTransactionsSessionKey] = useState(0);
    const [transactionsFocusId, setTransactionsFocusId] = useState<string | undefined>();

    const closeTransactionsHub = useCallback(() => {
        setShowTransactions(false);
        setTransactionsFocusId(undefined);
    }, []);

    const primeTransactionsHubMount = useCallback(() => {
        warmTransactionsOnHover();
    }, []);

    useEffect(() => registerTransactionsWarmUserId(userId), [userId]);

    useEffect(() => {
        if (!isRealSignedIn(userId)) return;
        return scheduleIdleWork(
            () => {
                warmTransactionsOnHover();
            },
            { minDelayMs: 6_000, timeoutMs: 15_000 },
        );
    }, [userId]);

    useEffect(() => {
        const onDismiss = (e: Event) => {
            const except = (e as CustomEvent<{ except?: TransientOverlayId }>).detail?.except;
            if (except !== 'transactions') {
                setShowTransactions(false);
                setTransactionsFocusId(undefined);
            }
            if (except == null) {
                releaseBodyScrollLock();
            }
        };
        window.addEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismiss);
        return () => window.removeEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismiss);
    }, []);

    const openTransactionsHub = useCallback(
        (focusId?: string) => {
            openTransactionsFromShell({
                signedIn: isRealSignedIn(userId),
                onSignedOut: () =>
                    SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${TRANSACTIONS_SHELL_FEATURE}`),
                onOpen: () => {
                    dismissTransientOverlays('transactions');
                    setArchiveType(null);
                    setShowLawsuitsWorkspace(false);
                    primeTransactionsHubMount();
                    warmTransactionsOnOpen(userId);
                    if (focusId !== undefined) setTransactionsFocusId(focusId);
                    else setTransactionsFocusId(undefined);
                    setShowTransactions(true);
                    void loadTransactionsHubModule().catch(() => undefined);
                },
            });
        },
        [primeTransactionsHubMount, setArchiveType, setShowLawsuitsWorkspace, userId],
    );

    const resetTransactionsShell = useCallback(() => {
        setTransactionsSessionKey((k) => k + 1);
        setShowTransactions(false);
        setTransactionsFocusId(undefined);
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
