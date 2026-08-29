import { useCallback } from 'react';
import { Archive } from '@/app/components/ui/icons/Archive';
import { ArchiveRestore } from '@/app/components/ui/icons/ArchiveRestore';
import { RotateCcw } from '@/app/components/ui/icons/RotateCcw';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import type { Transaction } from '@/app/modules/transactionsThreading/types';
import { useTransactionsThreadingStore } from '@/app/modules/transactionsThreading/store';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { buildThreadingWorkspacePin } from '@/app/workspace/workspacePinBuilders';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { TransactionsListStatusFilter } from '@/app/services/transactions/filterTransactionsList';

const TX_CARD_ACTION_BTN =
    'inline-flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl text-white/55 hover:text-[#F4F4F5] hover:bg-white/[0.06] transition-colors touch-manipulation shrink-0';

export function TransactionCardActions({
    transaction,
    listFilter,
}: {
    transaction: Transaction;
    listFilter: TransactionsListStatusFilter;
}) {
    const setTransactionArchived = useTransactionsThreadingStore((s) => s.setTransactionArchived);
    const setTransactionDeleted = useTransactionsThreadingStore((s) => s.setTransactionDeleted);
    const clusterPin = buildThreadingWorkspacePin(transaction);

    const onArchive = useCallback(async () => {
        try {
            await setTransactionArchived(transaction.id, true);
            SmartToast.success('نُقلت المعاملة إلى الأرشيف');
        } catch {
            SmartToast.error('تعذر أرشفة المعاملة');
        }
    }, [setTransactionArchived, transaction.id]);

    const onDelete = useCallback(async () => {
        const ok = await SmartDialog.confirm('نقل هذه المعاملة إلى المحذوفات؟');
        if (!ok) return;
        try {
            await setTransactionDeleted(transaction.id, true);
            SmartToast.success('نُقلت المعاملة إلى المحذوفات');
        } catch {
            SmartToast.error('تعذر حذف المعاملة');
        }
    }, [setTransactionDeleted, transaction.id]);

    const onRestoreFromArchive = useCallback(async () => {
        try {
            await setTransactionArchived(transaction.id, false);
            SmartToast.success('أُعيدت المعاملة من الأرشيف');
        } catch {
            SmartToast.error('تعذر استعادة المعاملة');
        }
    }, [setTransactionArchived, transaction.id]);

    const onRestoreFromTrash = useCallback(async () => {
        try {
            await setTransactionDeleted(transaction.id, false);
            SmartToast.success('أُعيدت المعاملة من المحذوفات');
        } catch {
            SmartToast.error('تعذر استعادة المعاملة');
        }
    }, [setTransactionDeleted, transaction.id]);

    const showArchiveActions = listFilter !== 'archived' && listFilter !== 'deleted';

    return (
        <div className="flex items-center shrink-0">
            {clusterPin ? (
                <WorkspacePinButton item={clusterPin} className="!min-w-[44px] !min-h-[44px] !w-11 !h-11" size={16} />
            ) : null}
            {showArchiveActions ? (
                <>
                    <button
                        type="button"
                        className={TX_CARD_ACTION_BTN}
                        aria-label="أرشفة المعاملة"
                        data-testid={`transactions-archive-${transaction.id}`}
                        onClick={() => void onArchive()}
                    >
                        <Archive size={16} />
                    </button>
                    <button
                        type="button"
                        className={TX_CARD_ACTION_BTN}
                        aria-label="حذف المعاملة"
                        data-testid={`transactions-delete-${transaction.id}`}
                        onClick={() => void onDelete()}
                    >
                        <Trash2 size={16} />
                    </button>
                </>
            ) : null}
            {listFilter === 'archived' ? (
                <button
                    type="button"
                    className={TX_CARD_ACTION_BTN}
                    aria-label="استعادة من الأرشيف"
                    data-testid={`transactions-restore-archive-${transaction.id}`}
                    onClick={() => void onRestoreFromArchive()}
                >
                    <ArchiveRestore size={16} />
                </button>
            ) : null}
            {listFilter === 'deleted' ? (
                <button
                    type="button"
                    className={TX_CARD_ACTION_BTN}
                    aria-label="استعادة من المحذوفات"
                    data-testid={`transactions-restore-trash-${transaction.id}`}
                    onClick={() => void onRestoreFromTrash()}
                >
                    <RotateCcw size={16} />
                </button>
            ) : null}
        </div>
    );
}
