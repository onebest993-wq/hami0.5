import React from 'react';
import type { TimelineEvent } from '../../criminalStore';
import {
    formatTimelineCategoryDisplayLabel,
    normalizeTimelineCategoryForDisplay,
    resolveTimelineEventTitle,
} from '../../criminalStageUtils';
import { ProceduralBacklinks } from '../ProceduralBacklinks';
import type { ProceduralLinkReference, ProceduralNavTarget } from '../../proceduralContainersEngine';
import { CriminalModalPortal, CRIMINAL_MODAL_Z } from '../../criminalModalPortal';

export type ProceduralLinkedTimelineModalProps = {
    open: boolean;
    event: TimelineEvent | null;
    proceduralReferences?: ProceduralLinkReference[];
    onNavigateToProcedural?: (target: ProceduralNavTarget) => void;
    onClose: () => void;
};

export const ProceduralLinkedTimelineModal = ({
    open,
    event,
    proceduralReferences = [],
    onNavigateToProcedural,
    onClose,
}: ProceduralLinkedTimelineModalProps) => {
    if (!open || !event) return null;

    const rawCategory = String(event.category ?? '').trim();
    const displayCategory = normalizeTimelineCategoryForDisplay(rawCategory);
    const title = resolveTimelineEventTitle(displayCategory, String(event.title ?? ''));
    const details = String(event.description ?? '').trim();

    return (
        <CriminalModalPortal zIndex={CRIMINAL_MODAL_Z.linkedTimeline}>
            <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                    <div className="text-white font-black text-sm">📅 حدث التايم لاين</div>
                    <button type="button" onClick={onClose} className="text-white/70 hover:text-white text-sm font-bold">
                        إغلاق
                    </button>
                </div>
                <div className="p-4 space-y-3">
                    {proceduralReferences.length > 0 && onNavigateToProcedural ? (
                        <ProceduralBacklinks
                            references={proceduralReferences}
                            onNavigate={(target) => {
                                onClose();
                                onNavigateToProcedural(target);
                            }}
                        />
                    ) : null}
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
                            className="rounded-xl bg-[#E6C673] text-[#0B1021] px-4 py-2 text-sm font-black"
                        >
                            حسناً
                        </button>
                    </div>
                </div>
            </div>
        </CriminalModalPortal>
    );
};
