import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ResolvedSmartLawArticle } from '@/app/services/dossier-notes/smartLawArticleResolver';
import { lawLabelForId, type SmartLawId } from '@/app/services/dossier-notes/smartLawLinker';

type SmartLawLinkPopoverProps = {
    x: number;
    y: number;
    loading: boolean;
    article: ResolvedSmartLawArticle | null;
    lawId: SmartLawId | null;
    articleNum: number;
    pinned?: boolean;
    onClose?: () => void;
};

export function SmartLawLinkPopover({
    x,
    y,
    loading,
    article,
    lawId,
    articleNum,
    pinned = false,
    onClose,
}: SmartLawLinkPopoverProps) {
    const label = article?.lawLabel ?? (lawId ? lawLabelForId(lawId) : 'مرجع قانوني');
    const title = article?.title || `المادة ${articleNum}`;
    const body = article?.content;

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            data-smart-law-panel="tooltip"
            className={`fixed z-[420] w-[min(92vw,340px)] -translate-x-1/2 rounded-xl border border-[#E6C673]/35 bg-[#0A0F1C]/97 px-3 py-2.5 shadow-[0_16px_48px_rgba(0,0,0,0.55)] ${
                pinned ? 'pointer-events-auto -translate-y-full' : 'pointer-events-none -translate-y-full'
            }`}
            style={{ left: x, top: y }}
            role="dialog"
            aria-label={`نص ${title}`}
            dir="rtl"
        >
            {pinned && onClose ? (
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-2 left-2 rounded-lg p-1 text-white/45 hover:text-white/80 hover:bg-white/10"
                    aria-label="إغلاق"
                >
                    <X size={14} />
                </button>
            ) : null}
            <p className="text-[10px] font-bold text-[#E6C673]/85 mb-1 pr-1">{label}</p>
            <p className="text-[11px] font-black text-[#F4F0E8] mb-1.5">{title}</p>
            {loading ? (
                <p className="text-[10px] text-white/45 animate-pulse">جاري تحميل نص المادة…</p>
            ) : body ? (
                <div className="max-h-40 overflow-y-auto overscroll-contain pr-1 text-[11px] leading-relaxed text-white/78 whitespace-pre-wrap break-words">
                    {body}
                </div>
            ) : (
                <p className="text-[10px] text-white/45">لم يُعثر على نص هذه المادة في المرجع المحلي.</p>
            )}
        </div>,
        document.body,
    );
}
