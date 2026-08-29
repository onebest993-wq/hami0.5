import { useState } from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import type { OtherPartyActionLogEntry } from '@/app/types/execution';
import { ExecutorDecisionFollowupMirror } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutorDecisionFollowupMirror';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import {
    resolveSpecialFollowupStatusLabel,
    shouldShowSpecialFollowupExecutorStrip,
} from '@/app/components/lawyer/ExecutionDashboard/utils/dossierControlDecisions';
import {
    excludeActiveCardFromSavedList,
    resolveSavedEntryOutcome,
} from './otherPartyActionsLogModel';

export function OtherPartyLatestRequestCard(props: {
    entry: OtherPartyActionLogEntry;
    decisionRow: Record<string, unknown> | null;
    executionId: string;
    appealPerspective: AppealUiPerspective;
    decisions: Record<string, unknown>[];
}) {
    const { entry, decisionRow, executionId, appealPerspective, decisions } = props;
    const [expanded, setExpanded] = useState(false);
    const executorStripVisible = Boolean(
        decisionRow &&
            shouldShowSpecialFollowupExecutorStrip(decisionRow, {
                allDecisions: decisions,
                appealPerspective,
            })
    );
    const statusLabel = decisionRow
        ? resolveSpecialFollowupStatusLabel(decisionRow, appealPerspective)
        : entry.outcome === 'pending'
          ? 'قرار المنفذ — قيد البت'
          : entry.outcome === 'approved'
            ? 'موافق'
            : entry.outcome === 'rejected'
              ? 'مرفوض'
              : 'آخر تحرك — اضغط للتفاصيل';

    return (
        <div className="overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-950/15 text-right">
            <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full flex-row-reverse items-center justify-between gap-2 px-4 py-3 text-right transition-colors hover:bg-white/[0.03]"
            >
                <span className="min-w-0 flex-1 text-right">
                    <p className="truncate text-[12px] font-bold text-amber-100">
                        تحرك الطرف الآخر — {entry.date}
                    </p>
                    <p className="text-[10px] text-amber-200/70">{statusLabel}</p>
                </span>
                {!executorStripVisible ? (
                    <ChevronDown
                        size={18}
                        className={`shrink-0 text-amber-300/70 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                        aria-hidden
                    />
                ) : null}
            </button>
            {executorStripVisible && decisionRow ? (
                <div className="border-t border-white/10 px-3 pb-2 pt-2">
                    <ExecutorDecisionFollowupMirror
                        executionId={executionId}
                        row={decisionRow}
                        requestKind="special_followup"
                        appealPerspective={appealPerspective}
                    />
                </div>
            ) : null}
            {expanded ? (
                <div className="border-t border-white/10 px-3 pb-3 pt-2">
                    <p className="whitespace-pre-wrap text-[10px] leading-relaxed text-slate-300">
                        {entry.content}
                    </p>
                </div>
            ) : null}
        </div>
    );
}


export function SavedEntriesList({
    sorted,
    activeCardEntryId,
    decisions = [],
}: {
    sorted: OtherPartyActionLogEntry[];
    activeCardEntryId?: string | null;
    decisions?: Record<string, unknown>[];
}) {
    const filtered = excludeActiveCardFromSavedList(
        sorted,
        activeCardEntryId ? { entry: { id: activeCardEntryId } as OtherPartyActionLogEntry } : null,
    );
    if (filtered.length === 0) {
        return (
            <p className="rounded-lg border border-dashed border-white/10 py-4 text-center text-[10px] text-slate-500">
                لا سجلات يدوية بعد.
            </p>
        );
    }

    return (
        <ul className="max-h-[min(36vh,240px)] space-y-2 overflow-y-auto pr-1">
            {filtered.map((row) => {
                const outcome = resolveSavedEntryOutcome(row, decisions);
                return (
                <li
                    key={row.id}
                    className={`rounded-xl border p-3 text-right border-r-4 ${
                        outcome === 'approved'
                            ? 'border-emerald-400/40 border-r-emerald-400 bg-emerald-950/35 shadow-[0_0_24px_-8px_rgba(52,211,153,0.45)]'
                            : outcome === 'rejected'
                              ? 'border-white/10 border-r-red-500 bg-black/25'
                              : 'border-white/10 border-r-amber-500 bg-black/25'
                    }`}
                >
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-amber-200/90">{row.date}</span>
                        <span
                            className={`rounded-full px-2 py-0.5 text-[10px] ${
                                outcome === 'approved'
                                    ? 'bg-emerald-500/25 text-emerald-100'
                                    : outcome === 'rejected'
                                      ? 'bg-red-500/25 text-red-100'
                                      : 'bg-amber-500/20 text-amber-100'
                            }`}
                        >
                            {outcome === 'approved'
                                ? 'موافقة'
                                : outcome === 'rejected'
                                  ? 'رفض'
                                  : 'قيد النظر'}
                        </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-amber-50/95">{row.content}</p>
                </li>
            );
            })}
        </ul>
    );
}
