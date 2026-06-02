import React from 'react';
import type { ProceduralLinkReference, ProceduralNavTarget } from '../proceduralContainersEngine';

/** شريط مختصر: عناصر مسارات التتبع المرتبطة بهذا الطلب */
export const RequestProceduralLinkStrip = ({
    references,
    onNavigate,
}: {
    references: ProceduralLinkReference[];
    onNavigate: (target: ProceduralNavTarget) => void;
}) => {
    if (!references.length) return null;
    const shown = references.slice(0, 3);
    const extra = references.length - shown.length;
    return (
        <div
            className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-slate-600/35"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
        >
            <span className="text-[9px] font-black text-sky-200/70 shrink-0">🛤️ في المسارات:</span>
            {shown.map((ref) => (
                <button
                    key={ref.itemId}
                    type="button"
                    onClick={() => onNavigate({ kind: ref.itemType, id: ref.itemId })}
                    className="rounded-md border border-sky-500/35 bg-sky-950/30 px-2 py-0.5 text-[9px] font-bold text-sky-100/90 hover:bg-sky-900/50 transition max-w-[14rem] truncate"
                    title={`${ref.breadcrumbLine} — ${ref.title}`}
                >
                    <span dir="ltr" className="tabular-nums text-sky-200/80 me-1">
                        {ref.numberChain}
                    </span>
                    {ref.itemType === 'note' ? '📝' : '⚡'} {ref.title}
                </button>
            ))}
            {extra > 0 ? (
                <span className="text-[9px] font-bold text-white/40">+{extra}</span>
            ) : null}
        </div>
    );
};
