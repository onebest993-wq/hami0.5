import React from 'react';
import type { ElementType, Dispatch, SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { EXEC_MODAL_CLOSE_BTN_CLASS } from '@/app/components/lawyer/ExecutionDashboard/executionModalMobileShell';
import { useExecutionOverlayDismiss } from '@/app/components/lawyer/ExecutionDashboard/useExecutionOverlayDismiss';

export function DebtorMemoBadgePortal({
    open,
    primaryMemoNoticeBadge,
    showDebtorUnservedMemoBadge,
    setExecutionMemoBadgePopoverOpen,
    onOpenUnifiedSummonsHub,
    X,
    Calendar,
}: {
    open: boolean;
    primaryMemoNoticeBadge: MemoNoticeBadge | null;
    showDebtorUnservedMemoBadge: boolean;
    setExecutionMemoBadgePopoverOpen: Dispatch<SetStateAction<boolean>>;
    onOpenUnifiedSummonsHub: (options?: {
        debtorKey?: string | null;
        initialMainTab?: 'tabligh' | 'taklif' | 'nashr' | 'guarantor' | null;
    }) => void;
    X: ElementType;
    Calendar: ElementType;
}) {
    useExecutionOverlayDismiss(open, () => setExecutionMemoBadgePopoverOpen(false));
    if (
        typeof document === 'undefined' ||
        !open ||
        !(primaryMemoNoticeBadge || showDebtorUnservedMemoBadge)
    ) {
        return null;
    }
    return createPortal(
                                                            <div
                                                                className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/65"
                                                                onClick={() =>
                                                                    setExecutionMemoBadgePopoverOpen(false)
                                                                }
                                                                role="presentation"
                                                            >
                                                                <div
                                                                    role="dialog"
                                                                    aria-modal="true"
                                                                    aria-labelledby="execution-memo-badge-detail-title"
                                                                    className="relative w-full max-w-xs rounded-xl border border-[#E6C673]/30 bg-[#0A0F1C] shadow-lg text-right max-h-[min(85dvh,22rem)] flex flex-col overflow-hidden"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                                                                        <button
                                                                            type="button"
                                                                            aria-label="إغلاق"
                                                                            onClick={() =>
                                                                                setExecutionMemoBadgePopoverOpen(
                                                                                    false
                                                                                )
                                                                            }
                                                                            className={EXEC_MODAL_CLOSE_BTN_CLASS}
                                                                        >
                                                                            <X size={16} />
                                                                        </button>
                                                                        <h2
                                                                            id="execution-memo-badge-detail-title"
                                                                            className="text-xs font-bold text-[#E6C673] flex items-center gap-2 flex-row-reverse"
                                                                        >
                                                                            <Calendar
                                                                                size={14}
                                                                                className="text-[#E6C673]/90 shrink-0"
                                                                            />
                                                                            {primaryMemoNoticeBadge
                                                                                ? 'مهلة التبليغ'
                                                                                : 'حالة التبليغ'}
                                                                        </h2>
                                                                    </div>
                                                                    <div className="space-y-2 overflow-y-auto px-3 py-3 text-right flex-1 min-h-0">
                                                                        {primaryMemoNoticeBadge ? (
                                                                            <>
                                                                                <div>
                                                                                    <p className="text-[9px] text-slate-500 mb-0.5">
                                                                                        تاريخ التبليغ
                                                                                    </p>
                                                                                    <p className="text-xs text-white font-mono tabular-nums">
                                                                                        {primaryMemoNoticeBadge.anchor}
                                                                                    </p>
                                                                                </div>
                                                                                <p
                                                                                    className={`text-[10px] font-semibold tabular-nums leading-relaxed ${
                                                                                        primaryMemoNoticeBadge.graceExpired
                                                                                            ? 'text-amber-200/95'
                                                                                            : 'text-emerald-300/95'
                                                                                    }`}
                                                                                >
                                                                                    {primaryMemoNoticeBadge.graceExpired
                                                                                        ? 'انتهت المهلة الرضائية.'
                                                                                        : `المتبقي ${primaryMemoNoticeBadge.remaining} يوماً — المهلة الرضائية لم تنتهِ بعد.`}
                                                                                    {primaryMemoNoticeBadge.graceExpired && (
                                                                                        <span className="block mt-1.5 text-amber-200/85 text-[9px]">
                                                                                            أعلن انتهاء المدة أو تابع
                                                                                            التبليغ اللاحق من محضر المتابعة.
                                                                                        </span>
                                                                                    )}
                                                                                </p>
                                                                            </>
                                                        ) : (
                                                            <>
                                                                <p className="text-[11px] font-bold text-amber-100">
                                                                    لم يُسجَّل تبليغ بعد
                                                                </p>
                                                                <p className="text-[10px] leading-relaxed text-slate-300">
                                                                    لم تُسجَّل بعد مذكرة الإخبار بالتنفيذ لهذا المدين —
                                                                    سجّل التبليغ لبدء احتساب المهلة الرضائية.
                                                                </p>
                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setExecutionMemoBadgePopoverOpen(false);
                                                                                        onOpenUnifiedSummonsHub({
                                                                                            debtorKey: null,
                                                                                            initialMainTab: 'tabligh',
                                                                                        });
                                                                                    }}
                                                                                    className="w-full rounded-xl border border-cyan-500/35 bg-cyan-950/40 py-2.5 text-[11px] font-bold text-cyan-50 hover:bg-cyan-900/50 hover:border-cyan-400/45"
                                                                >
                                                                                    تسجيل التبليغ
                                                                </button>
                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>,
                                document.body
                            );
}
