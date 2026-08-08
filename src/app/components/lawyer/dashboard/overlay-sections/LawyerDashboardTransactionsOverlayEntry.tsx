import React, { useCallback, useEffect, useState } from 'react';
import { resolveShellAuthUserId } from '@/app/services/auth/shellAuth';
import type { LawyerDashboardOverlaysBundleProps } from '../lawyerDashboardOverlaysBundles';
import { TransactionsThreadingHost } from '@/app/components/lawyer/TransactionsThreading/TransactionsThreadingHost';

type TransactionsErrorBoundaryComponent = React.ComponentType<{
    onClose: () => void;
    children: React.ReactNode;
}>;

function TransactionsErrorBoundaryGate({
    onClose,
    children,
}: {
    onClose: () => void;
    children: React.ReactNode;
}) {
    const [Boundary, setBoundary] = useState<TransactionsErrorBoundaryComponent | null>(null);

    useEffect(() => {
        let cancelled = false;
        void import('@/app/components/lawyer/TransactionsThreading/TransactionsErrorBoundary').then(
            (m) => {
                if (!cancelled) setBoundary(() => m.TransactionsErrorBoundary);
            },
        );
        return () => {
            cancelled = true;
        };
    }, []);

    if (!Boundary) {
        return <>{children}</>;
    }

    return <Boundary onClose={onClose}>{children}</Boundary>;
}

/**
 * مركز المعاملات — Host sync (مثل الإعدادات)؛ keepAlive يبقي System مخفياً جاهزاً.
 */
export function LawyerDashboardTransactionsOverlayEntry({
    shell,
    overlays,
}: Pick<LawyerDashboardOverlaysBundleProps, 'shell' | 'overlays'>) {
    const { userId, authUserId } = shell;
    const {
        showTransactions,
        transactionsHostMounted,
        transactionsSessionKey,
        transactionsFocusId,
        setTransactionsFocusId,
        closeTransactionsHub,
    } = overlays;

    const clearTransactionsFocus = useCallback(() => {
        setTransactionsFocusId(undefined);
    }, [setTransactionsFocusId]);

    const transactionsUserId = resolveShellAuthUserId(authUserId, userId) ?? userId;
    const shouldMount =
        Boolean(transactionsUserId) && (showTransactions || transactionsHostMounted);

    if (!shouldMount || !transactionsUserId) return null;

    return (
        <TransactionsErrorBoundaryGate onClose={closeTransactionsHub}>
            <TransactionsThreadingHost
                key={`transactions-hub-${transactionsSessionKey}`}
                open={showTransactions}
                keepAlive={transactionsHostMounted && !showTransactions}
                onBack={closeTransactionsHub}
                userId={transactionsUserId}
                initialTransactionId={transactionsFocusId}
                onInitialFocusConsumed={clearTransactionsFocus}
            />
        </TransactionsErrorBoundaryGate>
    );
}
