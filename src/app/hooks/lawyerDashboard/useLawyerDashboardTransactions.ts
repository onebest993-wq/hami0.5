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
import { loadTransactionsHubModule, prefetchTransactionsHubModule } from '@/app/runtime/transactionsHubLoader';
import { prefetchTransactionsHub } from '@/app/utils/lazyComponents';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import type { LawyerArchiveOverlay } from '@/app/hooks/useLawyerExecutionFiles';
import {
    dismissTransientOverlays,
} from '@/app/utils/bodyScrollLock';
import { registerDashboardOverlayCloser } from '@/app/hooks/lawyerDashboard/dashboardOverlayCoordinator';

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
    const [transactionsHostMounted, setTransactionsHostMounted] = useState(false);
    const [transactionsSessionKey, setTransactionsSessionKey] = useState(0);
    const [transactionsFocusId, setTransactionsFocusId] = useState<string | undefined>();

    const closeTransactionsHub = useCallback(() => {
        setShowTransactions(false);
        setTransactionsFocusId(undefined);
    }, []);

    const armTransactionsHost = useCallback(() => {
        setTransactionsHostMounted(true);
        warmTransactionsOnHover();
    }, []);

    const primeTransactionsHubMount = useCallback(() => {
        armTransactionsHost();
    }, [armTransactionsHost]);

    useEffect(() => {
        return registerTransactionsWarmUserId(userId);
    }, [userId]);

    useEffect(() => {
        if (!isRealSignedIn(userId)) return;
        prefetchTransactionsHub();
        prefetchTransactionsHubModule();
        return scheduleIdleWork(
            () => {
                armTransactionsHost();
                warmTransactionsOnOpen(userId);
            },
            { minDelayMs: 600, timeoutMs: 2_500 },
        );
    }, [armTransactionsHost, userId]);

    useEffect(() => {
        return registerDashboardOverlayCloser('transactions', () => {
            setShowTransactions(false);
            setTransactionsFocusId(undefined);
        });
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
                    armTransactionsHost();
                    warmTransactionsOnOpen(userId);
                    prefetchTransactionsHubModule();
                    if (focusId !== undefined) setTransactionsFocusId(focusId);
                    else setTransactionsFocusId(undefined);
                    setShowTransactions(true);
                    void loadTransactionsHubModule().catch(() => undefined);
                },
            });
        },
        [armTransactionsHost, setArchiveType, setShowLawsuitsWorkspace, userId],
    );

    const resetTransactionsShell = useCallback(() => {
        setTransactionsSessionKey((k) => k + 1);
        setShowTransactions(false);
        setTransactionsFocusId(undefined);
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
