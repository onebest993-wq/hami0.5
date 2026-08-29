import React from 'react';
import { ChevronRight } from '@/app/components/ui/icons/ChevronRight';
import { X } from '@/app/components/ui/icons/X';
import type { AccountLegalDocument } from './accountLegalContent';

export function AccountLegalDocumentHeader({
    doc,
    onClose,
}: {
    doc: AccountLegalDocument;
    onClose: () => void;
}) {
    return (
        <header className="hami-settings-sheet-header shrink-0 flex items-center gap-3 pb-3 border-b border-white/[0.06]">
            <button
                type="button"
                onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    event.preventDefault();
                    event.stopPropagation();
                    onClose();
                }}
                onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                }}
                data-testid="account-legal-document-back"
                aria-label="رجوع إلى تبويب الحساب"
                className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/75 hover:text-white touch-manipulation"
            >
                <ChevronRight size={18} aria-hidden />
            </button>
            <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-white truncate">{doc.title}</h2>
                {doc.subtitle ? (
                    <p className="text-[10px] text-white/45 mt-0.5 leading-relaxed line-clamp-2">{doc.subtitle}</p>
                ) : null}
            </div>
            <button
                type="button"
                onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    event.preventDefault();
                    event.stopPropagation();
                    onClose();
                }}
                onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                }}
                aria-label="إغلاق الوثيقة"
                className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-white/55 hover:text-white touch-manipulation"
            >
                <X size={18} aria-hidden />
            </button>
        </header>
    );
}
