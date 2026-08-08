import { useState } from 'react';
import { ChevronDown } from '@/app/components/ui/lucideIcons';
import { CommunicationContextPanel } from '../CommunicationContextPanel';
import type { CommunicationDisplayContext } from '../communicationDecisionModel';
import { STATUS_TONE_CLASS } from '../communicationDecisionModel';

export function CommunicationLogEntry({
    decisionId,
    ctx,
}: {
    decisionId: string;
    ctx: CommunicationDisplayContext;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div
            key={decisionId}
            className="rounded-xl border border-white/[0.07] bg-white/[0.02] text-right"
        >
            <button
                type="button"
                onClick={() => setExpanded((p) => !p)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-right min-h-[44px] hover:bg-white/[0.03] touch-manipulation transition-colors"
                aria-expanded={expanded}
            >
                <ChevronDown
                    size={15}
                    className={`shrink-0 text-slate-500 transition-transform duration-200 ${
                        expanded ? 'rotate-180' : ''
                    }`}
                    aria-hidden
                />
                <div className="min-w-0 flex-1 text-right">
                    <p className="truncate text-[12px] font-bold text-slate-100">{ctx.directorate}</p>
                    {ctx.letterDate ? (
                        <p className="truncate text-[10px] text-slate-500">
                            تاريخ الكتاب: {ctx.letterDate}
                        </p>
                    ) : null}
                </div>
                <span
                    className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold ${STATUS_TONE_CLASS[ctx.statusTone]}`}
                >
                    {ctx.statusLabel}
                </span>
            </button>
            {expanded ? (
                <div className="border-t border-white/[0.06] px-3 py-2.5">
                    <CommunicationContextPanel ctx={ctx} compact showMeta={false} detailLevel="archive" />
                </div>
            ) : null}
        </div>
    );
}
