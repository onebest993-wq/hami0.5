import { memo, useCallback, type ReactNode } from 'react';
import { Archive, ArchiveRestore, ChevronLeft, RotateCcw, Trash2 } from '@/app/components/ui/lucideIcons';
import type { Transaction } from '@/app/modules/transactionsThreading/types';
import { TransactionStatus } from '@/app/modules/transactionsThreading/types';
import { useTransactionsThreadingStore } from '@/app/modules/transactionsThreading/store';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { buildThreadingWorkspacePin } from '@/app/workspace/workspacePinBuilders';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { TransactionsListStatusFilter } from '@/app/services/transactions/filterTransactionsList';
import {
    TX_STATUS_ACTIVE,
    TX_STATUS_COMPLETED,
    TX_STATUS_PAUSED,
    TX_TEXT_MUTED,
    TX_TEXT_PRIMARY,
    TX_TEXT_SECONDARY,
    TxGlassPanel,
} from './transactionsGlassTheme';

function statusLabelAr(status: TransactionStatus) {
    if (status === TransactionStatus.Active) return 'نشطة';
    if (status === TransactionStatus.Paused) return 'في الانتظار';
    return 'مكتملة';
}

function statusBadgeClass(status: TransactionStatus) {
    if (status === TransactionStatus.Active) return TX_STATUS_ACTIVE;
    if (status === TransactionStatus.Paused) return TX_STATUS_PAUSED;
    return TX_STATUS_COMPLETED;
}

function buildOpenAriaLabel(transaction: Transaction): string {
    return `فتح المعاملة ${transaction.title}، الموكل ${transaction.clientName}، الجهة ${transaction.targetDepartment}، الحالة ${statusLabelAr(transaction.status)}`;
}

const TX_CARD_LABEL = 'text-[10px] font-bold text-[#8A8680] shrink-0';
const TX_CARD_VALUE = 'text-[12px] font-semibold truncate min-w-0';

function TxCardDetailRow({
    label,
    children,
    valueClassName,
}: {
    label: string;
    children: ReactNode;
    valueClassName?: string;
}) {
    return (
        <div className="flex items-baseline gap-1.5 min-w-0">
            <span className={TX_CARD_LABEL}>{label}</span>
            <span className={valueClassName ?? TX_CARD_VALUE}>{children}</span>
        </div>
    );
}

const TX_CARD_ACTION_BTN =
    'inline-flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 rounded-sm border border-[#3A5A68] bg-[#1A3340] text-[#B4B0AA] hover:text-[#D8D4CE] hover:border-[#8A8680] transition-colors touch-manipulation shrink-0';

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
    const showRestoreArchive = listFilter === 'archived';
    const showRestoreTrash = listFilter === 'deleted';

    return (
        <TxGlassPanel hover className="w-full text-right">
            <div className="flex items-center gap-2 px-3 py-3 sm:px-4 sm:py-3.5">
                <button
                    type="button"
                    onClick={() => {
                        if (pressDisabled) return;
                        onPress(transaction);
                    }}
                    disabled={pressDisabled}
                    data-testid={`transactions-card-${transaction.id}`}
                    aria-label={buildOpenAriaLabel(transaction)}
                    className={`flex-1 min-w-0 text-right touch-manipulation space-y-1${pressDisabled ? ' pointer-events-none' : ''}`}
                >
                    <TxCardDetailRow label="عنوان المعاملة:" valueClassName={`${TX_TEXT_PRIMARY} text-[13px] font-extrabold truncate min-w-0`}>
                        {transaction.title}
                    </TxCardDetailRow>
                    <TxCardDetailRow label="اسم الموكل:" valueClassName={`${TX_TEXT_MUTED} truncate min-w-0`}>
                        {transaction.clientName}
                    </TxCardDetailRow>
                    <TxCardDetailRow label="الجهة المختصة:" valueClassName={`${TX_TEXT_SECONDARY} truncate min-w-0`}>
                        {transaction.targetDepartment}
                    </TxCardDetailRow>
                    <div className="flex items-center gap-1.5 min-w-0 pt-0.5">
                        <span className={TX_CARD_LABEL}>الحالة:</span>
                        <span
                            className={`px-2 py-0.5 rounded-[3px] border text-[10px] font-bold shrink-0 ${statusBadgeClass(transaction.status)}`}
                        >
                            {statusLabelAr(transaction.status)}
                        </span>
                    </div>
                </button>

                <div className="flex items-center gap-1 shrink-0">
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
                    {showRestoreArchive ? (
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
                    {showRestoreTrash ? (
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
                    <span className="inline-flex items-center justify-center w-6 h-11 shrink-0" aria-hidden>
                        <ChevronLeft size={14} className="text-[#8A8680]/50" />
                    </span>
                </div>
            </div>
        </TxGlassPanel>
    );
});
