import React from 'react';
import type { ElementType, Dispatch, SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { EXEC_MODAL_CLOSE_BTN_CLASS } from '@/app/components/lawyer/ExecutionDashboard/executionModalMobileShell';
import { useExecutionOverlayDismiss } from '@/app/components/lawyer/ExecutionDashboard/useExecutionOverlayDismiss';

export function DebtorSummonsMarkerPortal({
    open,
    debtorSummonsMarkerLocal,
    summonsPurposeDraft,
    setSummonsPurposeDraft,
    setSummonsMarkerPopoverOpen,
    saveSummonsMarkerPurposeEdit,
    clearDebtorSummonsMarker,
    X,
    Bell,
}: {
    open: boolean;
    debtorSummonsMarkerLocal: SummonsMarker | null;
    summonsPurposeDraft: string;
    setSummonsPurposeDraft: Dispatch<SetStateAction<string>>;
    setSummonsMarkerPopoverOpen: Dispatch<SetStateAction<boolean>>;
    saveSummonsMarkerPurposeEdit: () => void;
    clearDebtorSummonsMarker: () => void;
    X: ElementType;
    Bell: ElementType;
}) {
    useExecutionOverlayDismiss(open, () => setSummonsMarkerPopoverOpen(false));
    if (
        typeof document === 'undefined' ||
        !open ||
        !debtorSummonsMarkerLocal?.id
    ) {
        return null;
    }
    return createPortal(
                                                            <div
                                                                className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/65"
                                                                onClick={() =>
                                                                    setSummonsMarkerPopoverOpen(false)
                                                                }
                                                                role="presentation"
                                                            >
                                                                <div
                                                                    role="dialog"
                                                                    aria-modal="true"
                                                                    aria-labelledby="summons-marker-detail-title"
                                                                    className="relative w-full max-w-xs rounded-xl border border-[#E6C673]/30 bg-[#0A0F1C] shadow-lg text-right max-h-[85dvh] flex flex-col overflow-hidden"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                                                                        <button
                                                                            type="button"
                                                                            aria-label="إغلاق"
                                                                            onClick={() =>
                                                                                setSummonsMarkerPopoverOpen(false)
                                                                            }
                                                                            className={EXEC_MODAL_CLOSE_BTN_CLASS}
                                                                        >
                                                                            <X size={16} />
                                                                        </button>
                                                                        <h2
                                                                            id="summons-marker-detail-title"
                                                                            className="text-xs font-bold text-[#E6C673] flex items-center gap-2 flex-row-reverse"
                                                                        >
                                                                            <Bell
                                                                                size={14}
                                                                                className="text-[#E6C673]/90 shrink-0"
                                                                            />
                                                                            حجز راتب
                                                                        </h2>
                                                                    </div>
                                                                    <div className="space-y-3 overflow-y-auto px-3 py-3 flex-1 min-h-0">
                                                                        <div>
                                                                            <p className="text-[9px] text-slate-500 mb-0.5">
                                                                                حجز الراتب
                                                                            </p>
                                                                            <p className="text-xs text-white font-mono tabular-nums">
                                                                                {debtorSummonsMarkerLocal?.date ||
                                                                                    '?'}
                                                                            </p>
                                                                        </div>
                                                                        <div>
                                                                            <label
                                                                                htmlFor="summons-purpose-floating"
                                                                                className="block text-[9px] text-slate-500 mb-1"
                                                                            >
                                                                                الغرض من مذكرة الاستحضار
                                                                            </label>
                                                                            <textarea
                                                                                id="summons-purpose-floating"
                                                                                value={summonsPurposeDraft}
                                                                                onChange={(e) =>
                                                                                    setSummonsPurposeDraft(
                                                                                        e.target.value
                                                                                    )
                                                                                }
                                                                                rows={3}
                                                                                className="w-full rounded-lg bg-white/[0.06] border border-[#E6C673]/20 px-2.5 py-2 text-white text-[11px] resize-none focus:outline-none focus:ring-1 focus:ring-[#E6C673]/40 min-h-[4.5rem]"
                                                                            />
                                                                        </div>
                                                                        <div className="flex flex-col gap-2 shrink-0">
                                                                            <button
                                                                                type="button"
                                                                                onClick={
                                                                                    saveSummonsMarkerPurposeEdit
                                                                                }
                                                                                className="rounded-lg bg-emerald-600/85 py-2 text-[11px] font-bold text-white shadow-md shadow-emerald-950/20"
                                                                            >
                                                                                حفظ
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setSummonsMarkerPopoverOpen(
                                                                                        false
                                                                                    );
                                                                                    clearDebtorSummonsMarker();
                                                                                }}
                                                                                className="rounded-lg border border-rose-500/45 bg-rose-950/45 py-2 text-[11px] font-bold text-rose-200"
                                                                            >
                                                                                الرصيد المتبقي
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>,
                                                document.body
                                                );
}
