import React from 'react';
import { ArrowLeft } from '@/app/components/ui/icons/ArrowLeft';
import { X } from '@/app/components/ui/icons/X';
import { Info } from '@/app/components/ui/icons/Info';
import { Pencil } from '@/app/components/ui/icons/Pencil';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';

export type ActiveOrderFileHeaderProps = {
    workspaceHeaderTitle: string;
    requestNumberText: string;
    procedureDetailsForPopover: string;
    courtName: string;
    isFinalized: boolean;
    isIqrarContext: boolean;
    statusConfig: { text: string; color: string };
    nextHearingDate: string;
    reportDueSoon: boolean;
    formatDateText: (value: unknown) => string;
    onClose: () => void;
    onOpenEdit: () => void;
};

const STATUS_DOT: Record<string, string> = {
    green: 'bg-emerald-400',
    blue: 'bg-blue-400',
    purple: 'bg-violet-400',
    slate: 'bg-slate-400',
    amber: 'bg-amber-400',
};

function splitHeaderTitle(title: string) {
    const idx = title.indexOf(':');
    if (idx === -1) return { kind: '', action: title.trim() };
    return {
        kind: title.slice(0, idx).trim(),
        action: title.slice(idx + 1).trim(),
    };
}

export function ActiveOrderFileHeader({
    workspaceHeaderTitle,
    requestNumberText,
    procedureDetailsForPopover,
    courtName,
    isFinalized,
    isIqrarContext,
    statusConfig,
    nextHearingDate,
    reportDueSoon,
    formatDateText,
    onClose,
    onOpenEdit,
}: ActiveOrderFileHeaderProps) {
    const { kind, action } = splitHeaderTitle(workspaceHeaderTitle);
    const statusDot = STATUS_DOT[statusConfig.color] ?? STATUS_DOT.amber;
    const displayTitle = action || workspaceHeaderTitle;

    return (
        <header className="sticky top-0 z-50 shrink-0 border-b border-white/10 bg-[#0B1021]">
            <div className="max-w-5xl mx-auto px-3 hami-overlay-header-safe-pad pb-2">
                <div className="flex items-start gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg bg-white/5 hover:bg-white/10 inline-flex items-center justify-center text-white/70 hover:text-white touch-manipulation mt-0.5"
                        aria-label="رجوع"
                    >
                        <ArrowLeft size={18} />
                    </button>

                    <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-start justify-between gap-2.5">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {kind ? (
                                        <span className="shrink-0 text-[10px] font-bold text-white/45">
                                            {kind}
                                        </span>
                                    ) : null}
                                    {!!procedureDetailsForPopover && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="shrink-0 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/55 hover:text-white touch-manipulation"
                                                    aria-label="تفاصيل الإجراء"
                                                >
                                                    <Info size={12} />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent
                                                side="bottom"
                                                align="start"
                                                sideOffset={6}
                                                className="z-[9999] max-w-sm rounded-lg border border-white/15 bg-[#0B1021] p-3 text-white"
                                            >
                                                <div className="text-white/70 text-xs font-bold mb-1">تفاصيل الإجراء</div>
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-white/90">
                                                    {procedureDetailsForPopover}
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                </div>
                                <h1 className="mt-1 text-sm font-bold text-white leading-snug line-clamp-2">
                                    {displayTitle}
                                </h1>
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                                {!isFinalized && (
                                    <button
                                        type="button"
                                        onClick={onOpenEdit}
                                        className="min-h-[44px] px-3 rounded-lg border border-[#E6C673]/30 bg-[#E6C673]/10 hover:bg-[#E6C673]/18 text-[#F5F0E6] text-xs font-bold inline-flex items-center gap-1.5 touch-manipulation"
                                    >
                                        <Pencil size={14} />
                                        <span className="hidden sm:inline">تعديل</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white touch-manipulation"
                                    aria-label="إغلاق"
                                >
                                    <X size={17} />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px]">
                                <span className="text-white/40">رقم الطلب</span>
                                <span className="text-[#E6C673] font-bold tabular-nums">{requestNumberText || '—'}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] min-w-0 max-w-full">
                                <span className="text-white/40 shrink-0">المحكمة</span>
                                <span className="text-white/90 font-semibold truncate">{courtName || '—'}</span>
                            </span>
                            {!isIqrarContext && (
                                <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px]">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} aria-hidden />
                                    <span className="text-white/75 font-semibold">{statusConfig.text}</span>
                                </span>
                            )}
                        </div>

                        {!isIqrarContext && (nextHearingDate || reportDueSoon) && (
                            <div className="flex flex-wrap gap-1.5">
                                {!!nextHearingDate && (
                                    <span className="inline-flex items-center rounded-lg px-2 py-0.5 border border-blue-500/20 bg-blue-500/10 text-blue-100 text-[10px] font-bold">
                                        الجلسة: {formatDateText(nextHearingDate)}
                                    </span>
                                )}
                                {reportDueSoon && (
                                    <span className="inline-flex items-center rounded-lg px-2 py-0.5 border border-amber-500/20 bg-amber-500/10 text-amber-100 text-[10px] font-bold">
                                        تقرير الخبير قريب
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
