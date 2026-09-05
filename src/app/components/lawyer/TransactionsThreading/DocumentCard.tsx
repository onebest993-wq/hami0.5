import type { TransactionDocument } from '@/app/modules/transactionsThreading/types';
import { TX_ICON_BTN, TX_TEXT_MUTED, TX_TEXT_OCHRE, TX_TEXT_PRIMARY } from './transactionsGlassTheme';
import { TrashIcon } from './transactionsTheme/icons';

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
    <div dir="rtl" className="relative border-b border-white/[0.07] py-2">
      {!readOnly ? (
        <button
          type="button"
          className={`${TX_ICON_BTN} absolute top-1 left-0`}
          aria-label="حذف المستمسك"
          onClick={() => onDelete(doc)}
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      ) : null}

      <div className={`${TX_TEXT_PRIMARY} font-semibold text-sm leading-5 truncate pe-10`}>{doc.title}</div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <div className={`text-[11px] font-semibold ${TX_TEXT_OCHRE}`}>{doc.ownerTag}</div>
        <div className={`${TX_TEXT_MUTED} text-[11px] shrink-0`}>{formatDateAr(doc.uploadedAt)}</div>
      </div>
    </div>
  );
}
