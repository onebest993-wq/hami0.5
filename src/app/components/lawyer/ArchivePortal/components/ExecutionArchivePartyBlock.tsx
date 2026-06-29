import React from 'react';
import type { ExecutionArchiveCardView } from '../utils';

function AgentBadge({ side }: { side: 'creditor' | 'debtor' }) {
    const cls =
        side === 'creditor'
            ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
            : 'border-rose-400/25 bg-rose-500/10 text-rose-100';
    return (
        <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold ${cls}`}>
            وكيل
        </span>
    );
}

/** الدائن أولاً ثم المدين — شارة وكيل بجانب الموكل فقط، ومعنوي عند المدين المعنوي */
export function ExecutionArchivePartyBlock({
    view,
    className = 'mb-4 space-y-2 rounded-2xl border border-white/8 bg-white/[0.03] p-3',
}: {
    view: ExecutionArchiveCardView;
    className?: string;
}) {
    const debtorLegal = view.debtorEntityKindLabel === 'معنوي';

    return (
        <div className={className} dir="rtl">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/6 pb-2">
                <span className="shrink-0 text-[10px] font-medium text-slate-500">الدائن</span>
                {!view.isRepresentingDebtor ? <AgentBadge side="creditor" /> : null}
                <span className="min-w-0 text-sm font-bold text-white">{view.creditorLabel}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="shrink-0 text-[10px] font-medium text-slate-500">المدين</span>
                {view.isRepresentingDebtor ? <AgentBadge side="debtor" /> : null}
                {debtorLegal ? (
                    <span className="inline-flex shrink-0 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2 py-0.5 text-[9px] font-bold text-indigo-200">
                        معنوي
                    </span>
                ) : null}
                <span className="min-w-0 text-sm font-bold text-slate-200">{view.debtorLabel}</span>
            </div>
        </div>
    );
}
