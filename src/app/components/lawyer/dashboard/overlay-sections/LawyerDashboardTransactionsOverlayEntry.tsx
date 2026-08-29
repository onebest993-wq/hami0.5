import React, { useCallback } from 'react';
import { resolveShellAuthUserId } from '@/app/services/auth/shellAuth';
import type { LawyerDashboardOverlaysBundleProps } from '../lawyerDashboardOverlaysBundles';
import { TransactionsThreadingHost } from '@/app/components/lawyer/TransactionsThreading/TransactionsThreadingHost';
import { TransactionsErrorBoundary } from '@/app/components/lawyer/TransactionsThreading/TransactionsErrorBoundary';

/**
 * مركز المعاملات — Host + حدود الخطأ ثابتان؛ الطبقة المغلقة لا تُبقي System.
 */
export function LawyerDashboardTransactionsOverlayEntry({
    shell,
    overlays,
}: Pick<LawyerDashboardOverlaysBundleProps, 'shell' | 'overlays'>) {
    const { userId, authUserId } = shell;
    const {
        showTransactions,
        transactionsSessionKey,
        transactionsFocusId,
        setTransactionsFocusId,
        closeTransactionsHub,
    } = overlays;

    const clearTransactionsFocus = useCallback(() => {
        setTransactionsFocusId(undefined);
    }, [setTransactionsFocusId]);

    const transactionsUserId = resolveShellAuthUserId(authUserId, userId) ?? userId;
    if (!showTransactions || !transactionsUserId) return null;

    return (
        <TransactionsErrorBoundary onClose={closeTransactionsHub}>
            <TransactionsThreadingHost
                key={`transactions-hub-${transactionsSessionKey}`}
                open={showTransactions}
                onBack={closeTransactionsHub}
                userId={transactionsUserId}
                initialTransactionId={transactionsFocusId}
                onInitialFocusConsumed={clearTransactionsFocus}
            />
        </TransactionsErrorBoundary>
    );
}
