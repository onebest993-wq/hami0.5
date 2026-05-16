import { ArrowDownLeft, ArrowUpRight, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { FinanceRecordType, type FinanceRecord } from '@/app/modules/transactionsThreading';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';

function formatDateAr(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatIqd(amount: number) {
  try {
    return new Intl.NumberFormat('ar-IQ').format(amount) + ' د.ع';
  } catch {
    return `${amount} د.ع`;
  }
}

export function FinancialRecordCard({
  record,
  onEdit,
  onDelete,
  readOnly,
}: {
  record: FinanceRecord;
  onEdit: (record: FinanceRecord) => void;
  onDelete: (record: FinanceRecord) => void;
  readOnly?: boolean;
}) {
  const isAdvance = record.type === FinanceRecordType.AdvancePayment;

  return (
    <div
      dir="rtl"
      className="w-full text-right rounded-2xl bg-white/5 border border-white/10 px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.22)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-white font-bold text-sm truncate">{record.description}</div>
          <div className="text-gray-400 text-xs mt-1">{formatDateAr(record.date)}</div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!readOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-gray-200 flex items-center justify-center hover:bg-white/10"
                  aria-label="خيارات الحركة"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="z-[1200] bg-[#071022] border border-[#D4AF37]/20 text-gray-200 rounded-xl p-1">
                <DropdownMenuItem onSelect={() => onEdit(record)} className="cursor-default">
                  <span className="inline-flex items-center gap-2">
                    <Pencil className="w-4 h-4" />
                    تعديل
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onDelete(record)} className="cursor-default text-rose-200 focus:text-rose-200">
                  <span className="inline-flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    حذف
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div
            className={`w-9 h-9 rounded-xl bg-black/20 border border-white/10 flex items-center justify-center ${
              isAdvance ? 'text-emerald-300' : 'text-rose-300'
            }`}
          >
            {isAdvance ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
          </div>
          <div className={`text-sm font-bold ${isAdvance ? 'text-emerald-200' : 'text-rose-200'}`}>
            {formatIqd(record.amount)}
          </div>
        </div>
      </div>
    </div>
  );
}
