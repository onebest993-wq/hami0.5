import React from 'react';
import type { ExecutionArchiveCardView } from '../executionArchiveCardView';

function AgentBadge({ side }: { side: 'creditor' | 'debtor' }) {
    const cls =
        side === 'creditor'
            ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
            : 'border-rose-400/25 bg-rose-500/10 text-rose-100';
    return (
        <span className={`inline-flex shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${cls}`}>
            وكيل
        </span>
    );
}

/** عمودان متوازيان — تسمية صغيرة فوق اسم بارز */
export function ExecutionArchivePartyBlock({
    view,
    className = 'mb-2 rounded-lg border border-white/8 bg-white/[0.03] p-2',
}: {
    view: ExecutionArchiveCardView;
    className?: string;
}) {
    const debtorLegal = view.debtorEntityKindLabel === 'معنوي';

    return (
        <div className={className} dir="rtl">
            <div className="grid grid-cols-2 gap-2">
                <div className="min-w-0 space-y-0.5 border-l border-white/10 pl-2">
                    <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] font-semibold tracking-wide text-slate-400">
                            الدائن
                        </span>
                        {!view.isRepresentingDebtor ? <AgentBadge side="creditor" /> : null}
                    </div>
                    <p className="break-words text-[12px] font-bold leading-snug text-white">
                        {view.creditorLabel}
                    </p>
                </div>
                <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] font-semibold tracking-wide text-slate-400">
                            المدين
                        </span>
                        {view.isRepresentingDebtor ? <AgentBadge side="debtor" /> : null}
                        {debtorLegal ? (
                            <span className="inline-flex shrink-0 rounded-md border border-indigo-400/30 bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-bold text-indigo-200">
                                معنوي
                            </span>
                        ) : null}
                    </div>
                    <p className="break-words text-[12px] font-bold leading-snug text-slate-100">
                        {view.debtorLabel}
                    </p>
                </div>
            </div>
        </div>
    );
}
