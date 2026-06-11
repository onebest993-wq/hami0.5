import React from 'react';
import { createPortal } from 'react-dom';
import type { ElementType } from 'react';

export type HeirsQuickViewRow = {
    name: string;
    phone?: string;
    address?: string;
    isClient?: boolean;
};

export type ExecutionHeirsQuickViewModalProps = {
    heirsQuickView: { title: string; rows: HeirsQuickViewRow[] } | null;
    setHeirsQuickView: (v: null) => void;
    X: ElementType;
};

/** عرض سريع لأسماء الورثة — دائماً عبر portal (لا يعتمد على شرط تحميل ExecutionModalsContainer) */
export function ExecutionHeirsQuickViewModal({
    heirsQuickView,
    setHeirsQuickView,
    X,
}: ExecutionHeirsQuickViewModalProps) {
    if (!heirsQuickView || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[210] flex items-center justify-center bg-black/70 p-4"
            role="presentation"
            onClick={() => setHeirsQuickView(null)}
        >
            <div
                className="w-full max-w-md rounded-2xl border border-cyan-400/35 bg-[#0A0F1C] p-3 text-right"
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2">
                    <button
                        type="button"
                        onClick={() => setHeirsQuickView(null)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10"
                        aria-label="إغلاق عرض الورثة"
                    >
                        <X size={16} />
                    </button>
                    <p className="text-[12px] font-bold text-cyan-200">{heirsQuickView.title}</p>
                    <span className="w-7" aria-hidden />
                </div>
                <div className="max-h-[60vh] space-y-2 overflow-y-auto">
                    {heirsQuickView.rows.map((h, idx) => (
                        <div
                            key={`${h.name}-${idx}`}
                            className="rounded-xl border border-white/10 bg-slate-900/35 px-2.5 py-2"
                        >
                            <p className="flex items-center justify-end gap-1 text-[11px] font-bold text-slate-100">
                                <span>{h.name}</span>
                                <span className="text-[11px] font-black text-white/50">#{idx + 1}</span>
                                {h.isClient ? (
                                    <span className="text-[11px] text-[#E6C673]" title="موكلي">
                                        ★
                                    </span>
                                ) : null}
                            </p>
                            <div className="mt-1 grid grid-cols-2 gap-1.5">
                                <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1">
                                    <p className="text-[9px] text-slate-500">الهاتف</p>
                                    <p className="text-[10px] text-slate-200 [unicode-bidi:plaintext]">
                                        {h.phone?.trim() || '—'}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1">
                                    <p className="text-[9px] text-slate-500">العنوان</p>
                                    <p className="text-[10px] text-slate-200 break-words">
                                        {h.address?.trim() || '—'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
}
