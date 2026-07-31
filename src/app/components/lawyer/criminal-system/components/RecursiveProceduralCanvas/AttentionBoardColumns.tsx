import React from 'react';
import type { ProceduralAttentionEntry } from '../../proceduralContainersEngine';

const AttentionMicroCard = ({
    entry,
    tone,
    onFocus,
}: {
    entry: ProceduralAttentionEntry;
    tone: 'overdue' | 'upcoming' | 'neutral';
    onFocus: (actionId: string) => void;
}) => {
    const toneClass =
        tone === 'overdue'
            ? 'border-red-500/35 bg-red-950/20 hover:border-red-400/50'
            : tone === 'upcoming'
              ? 'border-orange-500/30 bg-orange-950/15 hover:border-orange-400/45'
              : 'border-slate-600/45 bg-slate-900/50 hover:border-slate-500/60';
    return (
        <button
            type="button"
            onClick={() => onFocus(entry.actionId)}
            className={`w-full text-right rounded-lg border px-2 py-1.5 transition ${toneClass}`}
        >
            <div className="text-[10px] font-black text-white/90 whitespace-normal break-words leading-snug">
                {entry.title}
            </div>
            {entry.followUpDate ? (
                <div className="text-[9px] font-bold text-white/45 mt-0.5" dir="ltr">
                    {entry.followUpDate}
                </div>
            ) : null}
            <div className="text-[8px] text-white/30 font-bold mt-0.5 truncate" title={entry.pathLabel}>
                {entry.pathLabel}
            </div>
        </button>
    );
};

export const AttentionColumn = ({
    title,
    entries,
    tone,
    emptyHint,
    onFocus,
}: {
    title: string;
    entries: ProceduralAttentionEntry[];
    tone: 'overdue' | 'upcoming' | 'neutral';
    emptyHint: string;
    onFocus: (actionId: string) => void;
}) => (
    <div className="min-w-0 flex-1 rounded-lg border border-slate-700/40 bg-slate-950/40 p-2">
        <div className="text-[10px] font-black text-white/55 mb-1.5">{title}</div>
        {entries.length === 0 ? (
            <div className="text-[9px] font-bold text-white/30 py-2 text-center">{emptyHint}</div>
        ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto pe-0.5">
                {entries.map((e) => (
                    <AttentionMicroCard key={e.actionId} entry={e} tone={tone} onFocus={onFocus} />
                ))}
            </div>
        )}
    </div>
);
