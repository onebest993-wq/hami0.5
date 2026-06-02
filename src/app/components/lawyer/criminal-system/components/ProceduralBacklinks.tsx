import React from 'react';
import type { ProceduralLinkReference, ProceduralNavTarget } from '../proceduralContainersEngine';

export const ProceduralBacklinks = ({
    references,
    onNavigate,
}: {
    references: ProceduralLinkReference[];
    onNavigate: (target: ProceduralNavTarget) => void;
}) => {
    if (!references.length) return null;
    return (
        <div
            className="rounded-lg border border-sky-500/30 bg-sky-950/25 px-3 py-2.5 space-y-2 print:hidden"
            dir="rtl"
        >
            <div className="text-[10px] font-black text-sky-200/90">
                🛤️ مرتبط في مسارات التتبع ({references.length})
            </div>
            <ul className="space-y-1.5">
                {references.map((ref) => (
                    <li key={ref.itemId}>
                        <button
                            type="button"
                            onClick={() => onNavigate({ kind: ref.itemType, id: ref.itemId })}
                            className="w-full text-right rounded-lg border border-slate-600/45 bg-slate-900/50 px-2.5 py-2 hover:border-sky-500/40 hover:bg-slate-800/60 transition"
                        >
                            <div className="flex items-start gap-2">
                                <span
                                    className="inline-flex h-7 min-w-[1.85rem] items-center justify-center shrink-0 rounded-md border border-slate-600/55 bg-slate-950 px-1.5 text-[11px] font-black text-white/80 tabular-nums"
                                    dir="ltr"
                                >
                                    {ref.numberChain}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[11px] font-black text-white/85 whitespace-normal break-words">
                                        {ref.itemType === 'note' ? '📝' : '⚡'} {ref.title}
                                    </div>
                                    {ref.breadcrumbLine ? (
                                        <div className="text-[9px] font-bold text-white/45 mt-0.5 whitespace-normal break-words">
                                            {ref.breadcrumbLine}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};
