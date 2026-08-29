import type { JourneyNode } from '@/app/types/criminal';
import type { OtherEvidenceItem } from '../criminalCaseModel';
import { JourneyStageBadge } from './JourneyStageBadge';

export type OtherEvidenceLogCardProps = {
    item: OtherEvidenceItem;
    stageJourney: JourneyNode[] | undefined;
    readOnly: boolean;
    /** يفتح مودال تأكيد النقل إلى سلة المهملات — يُدار في الأعلى. */
    onRequestTrash: () => void;
};

/**
 * بطاقة دليل إثبات آخر في سجل الإفادات
 * — مستخرَجة من CriminalDashboardResolvedRuntime ضمن تفكيك المكوّن العملاق.
 */
export function OtherEvidenceLogCard({
    item,
    stageJourney,
    readOnly,
    onRequestTrash,
}: OtherEvidenceLogCardProps) {
    const notes = String(item.notes ?? '').trim();
    return (
        <div className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm shadow-[0_4px_24px_rgba(0,0,0,0.18)] ring-1 ring-white/[0.06]">
            <div className="flex flex-wrap items-center gap-2">
                <div className="text-white/90 font-black text-base whitespace-normal break-words">
                    {item.evidenceType}
                </div>
                <JourneyStageBadge
                    stageJourney={stageJourney}
                    item={{
                        attachmentDate: item.attachmentDate ?? item.createdAt,
                        proceduralNodeId: item.proceduralNodeId,
                    }}
                />
                <div
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-black whitespace-normal break-words ${
                        item.isLinkedToDossier
                            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                            : 'border-slate-600/60 bg-slate-700/40 text-white/80'
                    }`}
                >
                    {item.isLinkedToDossier ? 'مرتبط في الإضبارة' : 'غير مرتبط في الإضبارة'}
                </div>
                {item.attachmentDate ? (
                    <div className="rounded-full border border-[#E6C673]/45 bg-[#E6C673]/10 px-2.5 py-1 text-[11px] font-black text-[#E6C673]">
                        إرفاق: {item.attachmentDate}
                    </div>
                ) : item.createdAt ? (
                    <div className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-black text-white/70">
                        {item.createdAt}
                    </div>
                ) : null}
                {!readOnly ? (
                    <button
                        type="button"
                        onClick={onRequestTrash}
                        className="mr-auto rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-[11px] font-black text-red-200/80 hover:text-red-200 hover:bg-red-500/15 transition print:hidden"
                        aria-label="نقل الدليل إلى سلة المهملات"
                    >
                        🗑️
                    </button>
                ) : null}
            </div>
            {notes ? (
                <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-white/80 text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {notes}
                </div>
            ) : null}
        </div>
    );
}
