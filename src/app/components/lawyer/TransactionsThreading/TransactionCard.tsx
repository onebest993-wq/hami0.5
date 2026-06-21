import { Building2, ChevronLeft } from 'lucide-react';
import type { Transaction } from '@/app/modules/transactionsThreading/types';
import { TransactionStatus } from '@/app/modules/transactionsThreading/types';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { buildThreadingWorkspacePin } from '@/app/workspace/workspacePinBuilders';
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

export function TransactionCard({
    transaction,
    onPress,
}: {
    transaction: Transaction;
    onPress: (tx: Transaction) => void;
}) {
    const clusterPin = buildThreadingWorkspacePin(transaction);

    return (
        <TxGlassPanel hover className="w-full text-right">
            <button
                type="button"
                onClick={() => onPress(transaction)}
                className="w-full text-right px-4 py-4"
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className={`${TX_TEXT_PRIMARY} font-extrabold text-[15px] truncate leading-snug`}>
                            {transaction.title}
                        </div>
                        <div className={`${TX_TEXT_MUTED} text-[12px] mt-1 truncate font-medium`}>
                            {transaction.clientName}
                        </div>
                    </div>
                    <div
                        className="flex items-center gap-1.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <span
                            className={`px-2.5 py-0.5 rounded-[3px] border text-[10px] font-bold ${statusBadgeClass(transaction.status)}`}
                        >
                            {statusLabelAr(transaction.status)}
                        </span>
                        {clusterPin ? (
                            <WorkspacePinButton item={clusterPin} className="!w-8 !h-8" size={14} />
                        ) : null}
                    </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 pt-3 border-t border-[#2A4550]/60">
                    <div className={`flex items-center gap-2 min-w-0 ${TX_TEXT_SECONDARY}`}>
                        <Building2 className="w-3.5 h-3.5 text-[#B4B0AA] shrink-0" />
                        <span className="text-[11px] truncate font-medium">{transaction.targetDepartment}</span>
                    </div>
                    <ChevronLeft size={14} className="text-[#8A8680]/50 shrink-0" />
                </div>
            </button>
        </TxGlassPanel>
    );
}
