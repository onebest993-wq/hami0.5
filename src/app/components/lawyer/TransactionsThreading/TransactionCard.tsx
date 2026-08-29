import { memo } from 'react';
import type { Transaction } from '@/app/modules/transactionsThreading/types';
import type { TransactionsListStatusFilter } from '@/app/services/transactions/filterTransactionsList';
import { TX_TEXT_MUTED, TX_TEXT_PRIMARY, TxGlassPanel } from './transactionsGlassTheme';
import { txStatusBadgeClass, txStatusLabelAr } from './transactionDetails/transactionDetailsUtils';
import { TransactionCardActions } from './TransactionCardActions';

function buildOpenAriaLabel(transaction: Transaction): string {
    return `فتح المعاملة ${transaction.title}، الموكل ${transaction.clientName}، الجهة ${transaction.targetDepartment}، الحالة ${txStatusLabelAr(transaction.status)}`;
}

export const TransactionCard = memo(function TransactionCard({
    transaction,
    listFilter,
    onPress,
    pressDisabled = false,
}: {
    transaction: Transaction;
    listFilter: TransactionsListStatusFilter;
    onPress: (tx: Transaction) => void;
    pressDisabled?: boolean;
}) {
    return (
        <TxGlassPanel hover className="w-full text-right [content-visibility:auto] [contain-intrinsic-size:auto_72px]">
            <div className="flex items-center gap-1 px-3 py-2">
                <button
                    type="button"
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
                        <span className={`${TX_TEXT_PRIMARY} text-[13px] font-semibold truncate min-w-0 flex-1`}>
                            {transaction.title}
                        </span>
                        <span
                            className={`px-1.5 py-0.5 rounded-md border text-[10px] font-bold shrink-0 ${txStatusBadgeClass(transaction.status)}`}
                        >
                            {txStatusLabelAr(transaction.status)}
                        </span>
                    </div>
                    <p className={`${TX_TEXT_MUTED} text-[11px] truncate mt-0.5`}>
                        {transaction.clientName}
                        <span className="text-white/25 mx-1" aria-hidden>
                            ·
                        </span>
                        {transaction.targetDepartment}
                    </p>
                </button>
                <TransactionCardActions transaction={transaction} listFilter={listFilter} />
            </div>
        </TxGlassPanel>
    );
});
