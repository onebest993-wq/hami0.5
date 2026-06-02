import React, { useState } from 'react';
import type { Statement } from '../criminalStore';
import type { TrialDeposition } from '../trialDepositionsEngine';

export type StatementsPhaseSectionsProps = {
    trialStatements: Statement[];
    investigationStatements: Statement[];
    trialDepositions?: TrialDeposition[];
    renderStatement: (statement: Statement) => React.ReactNode;
    renderTrialDeposition?: (deposition: TrialDeposition) => React.ReactNode;
};

export const StatementsPhaseSections = ({
    trialStatements,
    investigationStatements,
    trialDepositions = [],
    renderStatement,
    renderTrialDeposition,
}: StatementsPhaseSectionsProps) => {
    const [investigationOpen, setInvestigationOpen] = useState(false);
    const trialCount = trialStatements.length + trialDepositions.length;
    const empty = trialCount === 0 && investigationStatements.length === 0;

    if (empty) {
        return null;
    }

    return (
        <div className="space-y-4">
            <details open className="rounded-2xl border border-[#E6C673]/35 bg-slate-900/30 overflow-hidden">
                <summary className="list-none cursor-pointer px-4 py-3 flex items-center justify-between gap-2 bg-slate-800/50 border-b border-slate-700/40 [&::-webkit-details-marker]:hidden">
                    <span className="text-white font-black text-sm">🔥 إفادات محكمة الموضوع الحالية</span>
                    <span className="text-white/45 text-[11px] font-bold">{trialCount} إفادة</span>
                </summary>
                <div className="p-4 space-y-4">
                    {trialCount === 0 ? null : (
                        <>
                            {trialDepositions.map((dep) =>
                                renderTrialDeposition ? (
                                    <React.Fragment key={dep.id}>{renderTrialDeposition(dep)}</React.Fragment>
                                ) : null,
                            )}
                            {trialStatements.map((st) => renderStatement(st))}
                        </>
                    )}
                </div>
            </details>

            {investigationStatements.length > 0 ? (
                <details
                    open={investigationOpen}
                    onToggle={(e) => setInvestigationOpen(e.currentTarget.open)}
                    className="rounded-2xl border border-slate-700/50 bg-slate-950/40 overflow-hidden opacity-90"
                >
                    <summary className="list-none cursor-pointer px-4 py-3 flex items-center justify-between gap-2 bg-slate-900/60 border-b border-slate-700/35 [&::-webkit-details-marker]:hidden">
                        <span className="text-white/55 font-black text-sm">📁 إفادات مرحلة التحقيق الابتدائي</span>
                        <span className="text-white/35 text-[11px] font-bold">{investigationStatements.length} أرشيف</span>
                    </summary>
                    <div className="p-4 space-y-4 opacity-80">
                        {investigationStatements.map((st) => renderStatement(st))}
                    </div>
                </details>
            ) : null}
        </div>
    );
};
