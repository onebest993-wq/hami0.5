import React from 'react';
import {
    STATUS_TONE_CLASS,
    type CommunicationDisplayContext,
} from './communicationDecisionModel';

export function CommunicationContextPanel({
    ctx,
    compact = false,
}: {
    ctx: CommunicationDisplayContext;
    compact?: boolean;
}) {
    return (
        <div className={`space-y-2.5 ${compact ? '' : 'pt-0.5'}`}>
            <div className="flex flex-wrap items-center justify-end gap-2">
                <span
                    className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold ${STATUS_TONE_CLASS[ctx.statusTone]}`}
                >
                    {ctx.statusLabel}
                </span>
                {ctx.requestDate ? (
                    <span className="text-[10px] text-slate-500">تاريخ الطلب: {ctx.requestDate}</span>
                ) : null}
            </div>
            {ctx.referenceLabel ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-right">
                    <p className="text-[9px] font-bold text-slate-500">
                        {ctx.referenceTitle || 'مرجع الإجابة'}
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-200">{ctx.referenceLabel}</p>
                </div>
            ) : null}
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-right">
                <p className="text-[9px] font-bold text-slate-500">{ctx.outcomeTitle}</p>
                <p
                    className={`mt-1 whitespace-pre-wrap leading-relaxed text-slate-100 ${
                        compact ? 'text-[11px]' : 'text-[12px]'
                    }`}
                >
                    {ctx.outcomeBody}
                </p>
            </div>
        </div>
    );
}
