import React from 'react';
import { ArrowLeft, X, Info, Pencil } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';

export type ActiveOrderFileHeaderProps = {
    workspaceHeaderTitle: string;
    requestNumberText: string;
    procedureDetailsForPopover: string;
    courtName: string;
    isFinalized: boolean;
    isIqrarContext: boolean;
    statusConfig: { icon: string; text: string; color: string };
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
        <header className="sticky top-0 z-50 shrink-0 border-b border-white/[0.08] bg-[#0B1021]/98 backdrop-blur-md">
            <div className="max-w-5xl mx-auto px-4 py-3">
                <div className="flex items-start gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-10 h-10 shrink-0 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/70 hover:text-white transition-colors touch-manipulation mt-0.5"
                        aria-label="رجوع"
                    >
                        <ArrowLeft size={18} />
                    </button>

                    <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {kind ? (
                                        <span className="shrink-0 text-[10px] font-bold text-[#E6C673] border border-[#E6C673]/25 bg-[#E6C673]/10 px-2.5 py-0.5 rounded-lg">
                                            {kind}
                                        </span>
                                    ) : null}
                                    {!!procedureDetailsForPopover && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="shrink-0 w-7 h-7 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#E6C673] transition-colors touch-manipulation"
                                                    aria-label="تفاصيل الإجراء"
                                                >
                                                    <Info size={12} />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent
                                                side="bottom"
                                                align="start"
                                                sideOffset={6}
                                                className="z-[9999] max-w-sm rounded-xl border border-white/15 bg-[#0B1021] p-3 text-white shadow-2xl"
                                            >
                                                <div className="text-[#E6C673] text-xs font-extrabold mb-1">تفاصيل الإجراء</div>
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-white/90">
                                                    {procedureDetailsForPopover}
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                </div>
                                <h1 className="mt-1.5 text-base sm:text-lg font-extrabold text-white leading-snug line-clamp-2">
                                    {displayTitle}
                                </h1>
                            </div>

                            <div className="flex shrink-0 items-center gap-1.5">
                                {!isFinalized && (
                                    <button
                                        type="button"
                                        onClick={onOpenEdit}
                                        className="h-10 px-3 rounded-xl border border-[#E6C673]/30 bg-[#E6C673]/10 hover:bg-[#E6C673]/18 text-[#F5F0E6] text-xs font-bold transition-colors flex items-center gap-1.5 touch-manipulation"
                                    >
                                        <Pencil size={14} />
                                        <span className="hidden sm:inline">تعديل</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="w-10 h-10 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/70 hover:text-white transition-colors touch-manipulation"
                                    aria-label="إغلاق"
                                >
                                    <X size={17} />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px]">
                                <span className="text-white/40">رقم الطلب</span>
                                <span className="text-[#E6C673] font-bold tabular-nums">{requestNumberText || '—'}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] min-w-0 max-w-full">
                                <span className="text-white/40 shrink-0">المحكمة</span>
                                <span className="text-white/90 font-semibold truncate">{courtName || '—'}</span>
                            </span>
                            {!isIqrarContext && (
                                <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px]">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} aria-hidden />
                                    <span className="text-white/75 font-semibold">{statusConfig.text}</span>
                                </span>
                            )}
                        </div>

                        {!isIqrarContext && (nextHearingDate || reportDueSoon) && (
                            <div className="flex flex-wrap gap-2">
                                {!!nextHearingDate && (
                                    <span className="inline-flex items-center rounded-lg px-2.5 py-1 border border-blue-500/20 bg-blue-500/10 text-blue-100 text-[10px] font-bold">
                                        الجلسة: {formatDateText(nextHearingDate)}
                                    </span>
                                )}
                                {reportDueSoon && (
                                    <span className="inline-flex items-center rounded-lg px-2.5 py-1 border border-amber-500/20 bg-amber-500/10 text-amber-100 text-[10px] font-bold">
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
