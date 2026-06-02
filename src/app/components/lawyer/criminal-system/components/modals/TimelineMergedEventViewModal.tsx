import React from 'react';
import type { MergedTimelineEventView } from '../../caseMergeTimeline';
import { formatTimelineCategoryDisplayLabel, normalizeTimelineCategoryForDisplay, resolveTimelineEventTitle } from '../../criminalStageUtils';

export type TimelineMergedEventViewModalProps = {
    open: boolean;
    event: MergedTimelineEventView | null;
    onClose: () => void;
};

export const TimelineMergedEventViewModal = ({
    open,
    event,
    onClose,
}: TimelineMergedEventViewModalProps) => {
    if (!open || !event) return null;

    const rawCategory = String(event.category ?? '').trim();
    const displayCategory = normalizeTimelineCategoryForDisplay(rawCategory);
    const title = resolveTimelineEventTitle(displayCategory, String(event.title ?? ''));
    const details = String(event.description ?? event.title ?? '').trim();
    const originNum = String(event.originCaseNumber ?? '').trim() || '—';

    return (
        <div className="fixed inset-0 z-[222] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden" dir="rtl">
            <div className="w-full max-w-6xl rounded-xl border border-slate-700 bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                    <div className="text-white font-black text-sm whitespace-normal break-words">عرض إجراء مضموم (قراءة فقط)</div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/70 hover:text-white transition text-sm font-bold whitespace-normal break-words"
                    >
                        إغلاق
                    </button>
                </div>
                <div className="p-4 space-y-3">
                    <div className="rounded-xl border border-slate-600/50 bg-slate-800/40 px-3 py-2 text-slate-300 text-xs font-bold whitespace-normal break-words">
                        🔗 من الإضبارة المضمومة رقم {originNum} — سجل تاريخي مقفول ولا يُعدَّل من الإضبارة الأم.
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="w-full rounded-xl border border-slate-700 bg-slate-800/40 px-3 py-2 text-sm text-white/90">
                            <span className="text-white/50 text-xs block mb-1">تاريخ الحدث</span>
                            {event.date || '—'}
                        </div>
                        <div className="w-full rounded-xl border border-slate-700 bg-slate-800/40 px-3 py-2 text-sm text-white/90">
                            <span className="text-white/50 text-xs block mb-1">التصنيف</span>
                            {formatTimelineCategoryDisplayLabel(displayCategory) || '—'}
                        </div>
                    </div>
                    <div className="w-full rounded-xl border border-slate-700 bg-slate-800/40 px-3 py-2 text-sm text-white font-black">
                        {title || '—'}
                    </div>
                    <div className="w-full rounded-xl border border-slate-700 bg-slate-800/40 px-3 py-2 text-sm text-white/90 whitespace-normal break-words min-h-[80px]">
                        {details || '—'}
                    </div>
                    <div className="flex justify-end pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-700/60 transition whitespace-normal break-words"
                        >
                            إغلاق
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
