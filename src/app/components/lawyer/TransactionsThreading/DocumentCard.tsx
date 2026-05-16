import { FileText, MoreVertical, Trash2 } from 'lucide-react';
import type { TransactionDocument } from '@/app/modules/transactionsThreading';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/app/components/ui/dropdown-menu';

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
      className="relative rounded-2xl bg-white/5 border border-white/10 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.30)] hover:bg-white/7 hover:border-white/15 transition"
    >
      {!readOnly && (
        <div className="absolute top-3 left-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-gray-200 flex items-center justify-center hover:bg-white/10"
                aria-label="خيارات المستمسك"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="z-[1200] bg-[#071022] border border-[#D4AF37]/20 text-gray-200 rounded-xl p-1">
              <DropdownMenuItem
                onSelect={() => onDelete(doc)}
                className="cursor-default text-rose-200 focus:text-rose-200"
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

      <div className="w-11 h-11 rounded-2xl bg-black/20 border border-white/10 flex items-center justify-center text-[#D4AF37]">
        <FileText className="w-5 h-5" />
      </div>
      <div className="mt-3 text-white font-extrabold text-sm leading-6 truncate">{doc.title}</div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center h-7 px-3 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#F4C430] text-xs font-bold">
          {doc.ownerTag}
        </div>
        <div className="text-gray-400 text-xs shrink-0">{formatDateAr(doc.uploadedAt)}</div>
      </div>
    </div>
  );
}
