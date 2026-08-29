import React from 'react';
import type { buildProceduralAttentionBoard } from '../../proceduralContainersEngine';
import { AttentionColumn } from './AttentionBoardColumns';

export type ProceduralCanvasAttentionBoardProps = {
    attentionBoard: ReturnType<typeof buildProceduralAttentionBoard>;
    attentionOpen: boolean;
    onAttentionOpenChange: (open: boolean) => void;
    onFocusAction: (actionId: string) => void;
};

export function ProceduralCanvasAttentionBoard({
    attentionBoard,
    attentionOpen,
    onAttentionOpenChange,
    onFocusAction,
}: ProceduralCanvasAttentionBoardProps) {
    if (attentionBoard.total <= 0) return null;

    return (
        <details
            className="rounded-xl border border-slate-600/50 bg-slate-900/60 overflow-hidden print:hidden"
            open={attentionOpen}
            onToggle={(e) => onAttentionOpenChange(e.currentTarget.open)}
        >
            <summary className="list-none cursor-pointer px-3 py-2.5 flex items-center justify-between gap-2 border-b border-slate-700/40 bg-slate-800/40 [&::-webkit-details-marker]:hidden">
                <div className="text-[11px] font-black text-white/85">
                    🎯 مركز المتابعة والانتباه
                    <span className="text-white/45 font-bold ms-2">
                        ({attentionBoard.total} قيد المتابعة)
                    </span>
                </div>
                <span className="text-white/40 text-[10px] font-black">{attentionOpen ? '▾' : '▸'}</span>
            </summary>
            <div className="p-2 flex flex-col sm:flex-row gap-2">
                <AttentionColumn
                    title={`🚨 متأخرة (${attentionBoard.overdue.length})`}
                    entries={attentionBoard.overdue}
                    tone="overdue"
                    emptyHint="—"
                    onFocus={onFocusAction}
                />
                <AttentionColumn
                    title={`⏳ قادمة/اليوم (${attentionBoard.upcoming.length})`}
                    entries={attentionBoard.upcoming}
                    tone="upcoming"
                    emptyHint="—"
                    onFocus={onFocusAction}
                />
                <AttentionColumn
                    title={`📌 بدون موعد (${attentionBoard.noDate.length})`}
                    entries={attentionBoard.noDate}
                    tone="neutral"
                    emptyHint="—"
                    onFocus={onFocusAction}
                />
            </div>
        </details>
    );
}
