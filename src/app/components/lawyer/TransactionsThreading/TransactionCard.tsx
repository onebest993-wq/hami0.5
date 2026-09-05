import { memo } from 'react';
import type { Transaction } from '@/app/modules/transactionsThreading/types';
import type { TransactionsListStatusFilter } from '@/app/services/transactions/filterTransactionsList';
import { TX_TEXT_MUTED, TX_TEXT_PRIMARY } from './transactionsGlassTheme';
import { txStatusBadgeClass, txStatusLabelAr } from './transactionDetails/transactionDetailsUtils';
import { TransactionCardActions } from './TransactionCardActions';

function buildOpenAriaLabel(transaction: Transaction): string {
    return `فتح المعاملة ${transaction.title}، الموكل ${transaction.clientName}، الجهة ${transaction.targetDepartment}، الحالة ${txStatusLabelAr(transaction.status)}`;
}

export const TransactionCard = memo(function TransactionCard({
    transaction,
    listFilter,
    onPress,
    onPrimeDetails,
    pressDisabled = false,
}: {
    transaction: Transaction;
    listFilter: TransactionsListStatusFilter;
    onPress: (tx: Transaction) => void;
    onPrimeDetails?: () => void;
    pressDisabled?: boolean;
}) {
    return (
        <div className="w-full text-right border-b border-white/[0.06] [content-visibility:auto] [contain-intrinsic-size:auto_64px]">
            <div className="flex items-center gap-1 py-2">
                <button
                    type="button"
                    onPointerDown={() => {
                        if (pressDisabled) return;
                        onPrimeDetails?.();
                    }}
                    onClick={() => {
                        if (pressDisabled) return;
                        onPress(transaction);
                    }}
                    disabled={pressDisabled}
                    data-testid={`transactions-card-${transaction.id}`}
                    aria-label={buildOpenAriaLabel(transaction)}
                    className={`flex-1 min-w-0 text-right touch-manipulation${pressDisabled ? ' pointer-events-none' : ''}`}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <span className={`${TX_TEXT_PRIMARY} text-[14px] font-semibold truncate min-w-0 flex-1`}>
                            {transaction.title}
                        </span>
                        <span className={`text-[11px] font-semibold shrink-0 ${txStatusBadgeClass(transaction.status)}`}>
                            {txStatusLabelAr(transaction.status)}
                        </span>
                    </div>
                    <p className={`${TX_TEXT_MUTED} text-[12px] truncate mt-0.5`}>
                        {transaction.clientName}
                        <span className="text-white/25 mx-1" aria-hidden>
                            ·
                        </span>
                        {transaction.targetDepartment}
                    </p>
                </button>
                <TransactionCardActions transaction={transaction} listFilter={listFilter} />
            </div>
        </div>
    );
});
