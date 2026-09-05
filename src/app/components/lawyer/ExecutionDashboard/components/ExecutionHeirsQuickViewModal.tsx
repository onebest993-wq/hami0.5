import React, { useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ElementType } from 'react';
import { useOverlayEscapeDismiss } from '@/app/hooks/useOverlayEscapeDismiss';
import { EXEC_MODAL_Z } from '../executionDashboardConstants';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_EDIT_SHELL_MAX,
} from '../executionModalMobileShell';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';

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
    const close = useCallback(() => setHeirsQuickView(null), [setHeirsQuickView]);
    useOverlayEscapeDismiss(Boolean(heirsQuickView), close);
    useBodyScrollLock(Boolean(heirsQuickView));

    if (!heirsQuickView || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className={`fixed inset-0 flex items-center justify-center bg-black/70 p-4 ${EXEC_MODAL_BACKDROP_SAFE_PAD}`}
            style={{ zIndex: EXEC_MODAL_Z.nestedOverFollowUpPortal }}
            role="presentation"
            data-heirs-quick-view-modal="true"
            onClick={close}
        >
            <div
                className={`w-full max-w-md rounded-2xl border border-cyan-400/35 bg-[#0A0F1C] p-3 text-right ${EXEC_MODAL_EDIT_SHELL_MAX}`}
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2">
                    <button
                        type="button"
                        onClick={close}
                        className={EXEC_MODAL_CLOSE_BTN_CLASS}
                        aria-label="إغلاق عرض الورثة"
                    >
                        <X size={16} />
                    </button>
                    <p className="text-[12px] font-bold text-cyan-200">{heirsQuickView.title}</p>
                    <span className="w-7" aria-hidden />
                </div>
                <div className="max-h-[60dvh] space-y-2 overflow-y-auto overscroll-contain">
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
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
}
