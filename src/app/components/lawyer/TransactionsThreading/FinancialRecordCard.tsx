import { ArrowDownLeft, ArrowUpRight, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { FinanceRecordType, type FinanceRecord } from '@/app/modules/transactionsThreading/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import {
    TX_ACCENT_SURFACE,
    TX_CARD_SURFACE,
    TX_DROPDOWN_CONTENT,
    TX_DROPDOWN_FOCUS,
    TX_ICON_BTN,
    TX_INNER_SURFACE,
    TX_TEXT_MUTED,
    TX_TEXT_OCHRE,
    TX_TEXT_PRIMARY,
    TX_TEXT_SECONDARY,
} from './transactionsGlassTheme';

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
    <div dir="rtl" className={`w-full text-right ${TX_CARD_SURFACE}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`${TX_TEXT_PRIMARY} font-extrabold text-sm truncate`}>{record.description}</div>
          <div className={`${TX_TEXT_MUTED} text-xs mt-1 font-medium`}>{formatDateAr(record.date)}</div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!readOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={TX_ICON_BTN + ' !w-9 !h-9'} aria-label="خيارات الحركة">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className={TX_DROPDOWN_CONTENT}>
                <DropdownMenuItem onSelect={() => onEdit(record)} className={TX_DROPDOWN_FOCUS}>
                  <span className="inline-flex items-center gap-2">
                    <Pencil className="w-4 h-4" />
                    تعديل
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => onDelete(record)}
                  className={`${TX_DROPDOWN_FOCUS} text-[#D49248] focus:text-[#D49248]`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    حذف
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div
            className={`inline-flex items-center gap-1 h-8 px-2.5 rounded-[3px] border text-xs font-extrabold ${
              isAdvance
                ? TX_ACCENT_SURFACE + ' ' + TX_TEXT_OCHRE
                : TX_INNER_SURFACE + ' ' + TX_TEXT_SECONDARY
            }`}
          >
            {isAdvance ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
            {formatIqd(record.amount)}
          </div>
        </div>
      </div>
    </div>
  );
}
