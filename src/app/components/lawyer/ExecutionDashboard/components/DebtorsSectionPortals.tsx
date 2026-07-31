import React from 'react';
import type { ElementType, Dispatch, SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import type { MemoNoticeBadge, SummonsMarker } from './DebtorsSection.types';

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
    if (
        typeof document === 'undefined' ||
        !open ||
        !(primaryMemoNoticeBadge || showDebtorUnservedMemoBadge)
    ) {
        return null;
    }
    return createPortal(
                                                            <div
                                                                className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
                                                                onClick={() =>
                                                                    setExecutionMemoBadgePopoverOpen(false)
                                                                }
                                                                role="presentation"
                                                            >
                                                                <div
                                                                    role="dialog"
                                                                    aria-modal="true"
                                                                    aria-labelledby="execution-memo-badge-detail-title"
                                                                    className="relative w-full max-w-xs rounded-xl border border-[#E6C673]/30 bg-[#0A0F1C] shadow-2xl text-right max-h-[min(85vh,22rem)] flex flex-col overflow-hidden"
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
                                                                            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
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
    if (
        typeof document === 'undefined' ||
        !open ||
        !debtorSummonsMarkerLocal?.id
    ) {
        return null;
    }
    return createPortal(
                                                            <div
                                                                className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
                                                                onClick={() =>
                                                                    setSummonsMarkerPopoverOpen(false)
                                                                }
                                                                role="presentation"
                                                            >
                                                                <div
                                                                    role="dialog"
                                                                    aria-modal="true"
                                                                    aria-labelledby="summons-marker-detail-title"
                                                                    className="relative w-full max-w-xs rounded-xl border border-[#E6C673]/30 bg-[#0A0F1C] shadow-2xl text-right max-h-[85vh] flex flex-col overflow-hidden"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                                                                        <button
                                                                            type="button"
                                                                            aria-label="تسجيل راتب"
                                                                            onClick={() =>
                                                                                setSummonsMarkerPopoverOpen(false)
                                                                            }
                                                                            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
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
