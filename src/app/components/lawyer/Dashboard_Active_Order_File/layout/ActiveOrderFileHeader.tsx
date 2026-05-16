import React from 'react';
import { ArrowLeft, X, Info, Pencil, Printer } from 'lucide-react';
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
    onOpenMetaEdit: () => void;
};

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
    onOpenMetaEdit,
}: ActiveOrderFileHeaderProps) {
    return (
        <div className="sticky top-0 z-50 border-b border-white/10 bg-[#0B1021]/95 backdrop-blur px-3 py-2.5">
            <div className="max-w-7xl mx-auto flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 shrink-0 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all"
                        aria-label="رجوع"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-white font-extrabold text-base leading-snug truncate">{workspaceHeaderTitle}</h1>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-white/75">
                            <span className="inline-flex items-center gap-1 text-amber-400/95 font-bold">
                                رقم الطلب: {requestNumberText || '—'}
                                {!!procedureDetailsForPopover && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                className="w-6 h-6 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#E6C673] transition-colors"
                                                aria-label="تفاصيل الإجراء"
                                            >
                                                <Info size={13} />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent
                                            side="bottom"
                                            align="start"
                                            sideOffset={8}
                                            className="z-[9999] max-w-sm rounded-xl border border-white/15 bg-[#0B1021] p-4 text-white shadow-2xl"
                                        >
                                            <div className="text-[#E6C673] text-xs font-extrabold mb-2">تفاصيل الإجراء</div>
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-white/90">
                                                {procedureDetailsForPopover}
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                                {!isFinalized && (
                                    <button
                                        type="button"
                                        onClick={onOpenMetaEdit}
                                        className="w-6 h-6 rounded-md border border-white/10 bg-transparent hover:bg-white/5 text-white/60 hover:text-white flex items-center justify-center transition-colors"
                                        aria-label="تعديل بيانات الطلب"
                                    >
                                        <Pencil size={12} />
                                    </button>
                                )}
                            </span>
                            <span>
                                المحكمة: <span className="text-white font-bold">{courtName || '—'}</span>
                            </span>
                        </div>
                        {!isIqrarContext && (
                            <div className="flex flex-wrap items-center gap-1.5 text-white/50 text-[11px] mt-1">
                                <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 border ${
                                        statusConfig.color === 'green'
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-100'
                                            : statusConfig.color === 'blue'
                                              ? 'bg-blue-500/10 border-blue-500/20 text-blue-100'
                                              : statusConfig.color === 'purple'
                                                ? 'bg-purple-500/10 border-purple-500/20 text-purple-100'
                                                : statusConfig.color === 'slate'
                                                  ? 'bg-slate-500/10 border-slate-500/20 text-slate-100'
                                                  : 'bg-amber-500/10 border-amber-500/20 text-amber-100'
                                    }`}
                                >
                                    <span>{statusConfig.icon}</span>
                                    <span>{statusConfig.text}</span>
                                </span>
                                {!!nextHearingDate && (
                                    <span className="inline-flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 rounded-full px-2 py-0.5 text-blue-100">
                                        <span>الجلسة القادمة: {formatDateText(nextHearingDate)}</span>
                                    </span>
                                )}
                                {reportDueSoon && (
                                    <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5 text-amber-100">
                                        <span>تقرير الخبير قريب</span>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                    <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                        onClick={() => window.print()}
                    >
                        <Printer size={14} />
                        طباعة
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all"
                        aria-label="إغلاق"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
