import React from 'react';
import type { MergedTimelineEventView } from '../../caseMergeTimeline';
import { formatTimelineCategoryDisplayLabel, normalizeTimelineCategoryForDisplay, resolveTimelineEventTitle } from '../../criminalStageUtils';
import { CriminalModalPortal, CRIMINAL_MODAL_Z } from '../../criminalModalPortal';

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
        <CriminalModalPortal zIndex={CRIMINAL_MODAL_Z.procedural}>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="rounded-xl border border-slate-700 bg-slate-800/40 px-3 py-2 text-sm text-white/90">
                            <span className="text-white/50 text-xs block mb-1">التاريخ</span>
                            <span dir="ltr">{event.date || '—'}</span>
                        </div>
                        <div className="rounded-xl border border-slate-700 bg-slate-800/40 px-3 py-2 text-sm text-white/90">
                            <span className="text-white/50 text-xs block mb-1">التصنيف</span>
                            {formatTimelineCategoryDisplayLabel(displayCategory) || '—'}
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-700 bg-slate-800/40 px-3 py-2 text-sm text-white font-black whitespace-normal break-words">
                        {title || '—'}
                    </div>
                    {details ? (
                        <div className="rounded-xl border border-slate-700 bg-slate-800/40 px-3 py-2 text-sm text-white/85 whitespace-pre-wrap break-words">
                            {details}
                        </div>
                    ) : null}
                    <div className="flex justify-end pt-1">
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
        </CriminalModalPortal>
    );
};
