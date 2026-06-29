import { FileText, MoreVertical, Trash2 } from 'lucide-react';
import type { TransactionDocument } from '@/app/modules/transactionsThreading/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';
import {
    TX_ACCENT_SURFACE,
    TX_CARD_SURFACE,
    TX_DROPDOWN_CONTENT,
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
      className={`relative ${TX_CARD_SURFACE} p-4 hover:border-[#C4782F]/35 transition`}
    >
      {!readOnly && (
        <div className="absolute top-3 left-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={TX_ICON_BTN} aria-label="خيارات المستمسك">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className={TX_DROPDOWN_CONTENT}>
              <DropdownMenuItem
                onSelect={() => onDelete(doc)}
                className={`${TX_DROPDOWN_FOCUS} text-[#D49248] focus:text-[#D49248]`}
              >
                <span className="inline-flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  حذف
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="w-11 h-11 rounded-[3px] bg-[#1A3340] border border-[#2A4550] flex items-center justify-center text-[#D49248]">
        <FileText className="w-5 h-5" />
      </div>
      <div className={`mt-3 ${TX_TEXT_PRIMARY} font-extrabold text-sm leading-6 truncate`}>{doc.title}</div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className={`inline-flex items-center h-7 px-3 rounded-[3px] ${TX_ACCENT_SURFACE} ${TX_TEXT_OCHRE} text-xs font-bold`}>
          {doc.ownerTag}
        </div>
        <div className={`${TX_TEXT_MUTED} text-xs shrink-0 font-medium`}>{formatDateAr(doc.uploadedAt)}</div>
      </div>
    </div>
  );
}
