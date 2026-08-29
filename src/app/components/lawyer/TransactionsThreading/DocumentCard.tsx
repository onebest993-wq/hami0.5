import { MoreVertical } from '@/app/components/ui/icons/MoreVertical';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import type { TransactionDocument } from '@/app/modules/transactionsThreading/types';
import {
    TransactionsDropdownMenu,
    TransactionsDropdownMenuContent,
    TransactionsDropdownMenuItem,
    TransactionsDropdownMenuTrigger,
    runAfterTransactionsMenuClose,
} from './TransactionsDropdownMenu';
import {
    TX_DROPDOWN_FOCUS,
    TX_ICON_BTN,
    TX_TEXT_MUTED,
    TX_TEXT_OCHRE,
    TX_TEXT_PRIMARY,
} from './transactionsGlassTheme';

function formatDateAr(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function DocumentCard({
  doc,
  onDelete,
  readOnly,
}: {
  doc: TransactionDocument;
  onDelete: (doc: TransactionDocument) => void;
  readOnly?: boolean;
}) {
  return (
    <div
      dir="rtl"
      className="relative rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 hover:border-[#E6C673]/30"
    >
      {!readOnly && (
        <div className="absolute top-1.5 left-1.5">
          <TransactionsDropdownMenu>
            <TransactionsDropdownMenuTrigger asChild>
              <button type="button" className={TX_ICON_BTN} aria-label="خيارات المستمسك">
                <MoreVertical className="w-4 h-4" />
              </button>
            </TransactionsDropdownMenuTrigger>
            <TransactionsDropdownMenuContent>
              <TransactionsDropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  runAfterTransactionsMenuClose(() => onDelete(doc));
                }}
                className={`${TX_DROPDOWN_FOCUS} text-[#E6C673] focus:text-[#E6C673]`}
              >
                <span className="inline-flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  حذف
                </span>
              </TransactionsDropdownMenuItem>
            </TransactionsDropdownMenuContent>
          </TransactionsDropdownMenu>
        </div>
      )}

      <div className={`${TX_TEXT_PRIMARY} font-semibold text-sm leading-5 truncate pe-10`}>{doc.title}</div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <div className={`text-[11px] font-bold ${TX_TEXT_OCHRE}`}>{doc.ownerTag}</div>
        <div className={`${TX_TEXT_MUTED} text-[11px] shrink-0`}>{formatDateAr(doc.uploadedAt)}</div>
      </div>
    </div>
  );
}
