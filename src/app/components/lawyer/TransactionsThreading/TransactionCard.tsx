import { Building2 } from 'lucide-react';
import type { Transaction } from '@/app/modules/transactionsThreading';
import { TransactionStatus } from '@/app/modules/transactionsThreading';

function statusLabelAr(status: TransactionStatus) {
  if (status === TransactionStatus.Active) return 'نشطة';
  if (status === TransactionStatus.Paused) return 'في الانتظار';
  return 'مكتملة';
}

function statusBadgeClass(status: TransactionStatus) {
  if (status === TransactionStatus.Active) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20';
  if (status === TransactionStatus.Paused) return 'bg-amber-500/15 text-amber-300 border-amber-500/20';
  return 'bg-slate-500/15 text-slate-300 border-slate-500/20';
}

export function TransactionCard({
  transaction,
  onPress,
}: {
  transaction: Transaction;
  onPress: (tx: Transaction) => void;
}) {
  return (
    <button
      type="button"
      dir="rtl"
      onClick={() => onPress(transaction)}
      className="w-full text-right rounded-2xl bg-white/5 border border-white/10 hover:bg-white/7 hover:border-white/15 transition px-4 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-white font-bold text-base truncate">{transaction.title}</div>
          <div className="text-gray-400 text-sm mt-1 truncate">{transaction.clientName}</div>
        </div>
        <div className={`shrink-0 px-3 py-1 rounded-full border text-xs font-bold ${statusBadgeClass(transaction.status)}`}>
          {statusLabelAr(transaction.status)}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-gray-300">
        <Building2 className="w-4 h-4 text-[#D4AF37]" />
        <span className="text-sm truncate">{transaction.targetDepartment}</span>
      </div>
    </button>
  );
}

