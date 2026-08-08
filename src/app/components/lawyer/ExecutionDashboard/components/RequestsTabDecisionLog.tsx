import React from 'react';
import { CheckCircle, Gavel } from '@/app/components/ui/lucideIcons';
import {
    ExecutionInlineExecutorDecisionActions,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { ExecutorDecisionFollowupMirror } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutorDecisionFollowupMirror';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import {
    resolveSpecialFollowupStatusLabel,
    shouldShowSpecialFollowupExecutorStrip,
} from '@/app/components/lawyer/ExecutionDashboard/utils/dossierControlDecisions';
import { isAdminRequestsTabDecision } from '@/app/components/lawyer/ExecutionDashboard/utils/isAdminRequestsTabDecision';
import {
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';

export interface RequestsTabDecisionLogProps {
    executionId: string;
    decisions: Record<string, unknown>[];
    appealPerspective?: AppealUiPerspective;
}

function formatRequestBodyPreview(body: string): string {
    const trimmed = String(body || '').trim();
    if (!trimmed) return '—';
    return trimmed.replace(/^بتاريخ\s+[\d-]+:\s*/i, '').trim() || trimmed;
}

function statusToneClass(row: Record<string, unknown>): string {
    const rejected = isExecutorRowRejectedAndFinal(row);
    const pending =
        String(row.executorOutcome ?? 'pending') === 'pending' ||
        String(row.executorOutcome ?? '') === '';
    if (rejected) return 'border-rose-500/35 bg-rose-500/10 text-rose-100';
    if (pending) return 'border-amber-500/35 bg-amber-500/10 text-amber-100';
    return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-100';
}

export function RequestsTabDecisionLog({
    executionId,
    decisions,
    appealPerspective = 'creditor_agent',
}: RequestsTabDecisionLogProps) {
    const exId = String(executionId || '').trim();

    const adminDecisions = React.useMemo(() => {
        const list = Array.isArray(decisions) ? decisions : [];
        return list
            .filter((row) => isAdminRequestsTabDecision(row))
            .sort((a, b) => {
                const da = String(a?.resolvedAt ?? a?.date ?? '');
                const db = String(b?.resolvedAt ?? b?.date ?? '');
                return db.localeCompare(da, undefined, { numeric: true });
            });
    }, [decisions]);

    if (!exId) return null;

    return (
        <div className="space-y-2">
            <h4 className="flex flex-row-reverse items-center gap-1.5 px-1 text-[11px] font-bold text-emerald-200">
                <CheckCircle size={14} className="shrink-0" />
                سجل الطلبات
                {adminDecisions.length > 0 ? (
                    <span className="text-[9px] font-normal text-slate-500">
                        ({adminDecisions.length})
                    </span>
                ) : null}
            </h4>

            {adminDecisions.length === 0 ? (
                <p className="px-1 text-[10px] text-slate-500">
                    لا توجد طلبات في السجل بعد — أرسل طلباً من النموذج أعلاه.
                </p>
            ) : (
                <div className="space-y-2">
                    {adminDecisions.map((row) => {
                        const decisionId = String(row.id ?? '').trim();
                        if (!decisionId) return null;
                        const title = String(row.title ?? 'طلب إداري').trim();
                        const requestDate = String(row.date ?? row.resolvedAt ?? '').trim().slice(0, 10);
                        const statusLabel = resolveSpecialFollowupStatusLabel(row, appealPerspective);
                        const showExecutorStrip = shouldShowSpecialFollowupExecutorStrip(row, {
                            allDecisions: decisions,
                            appealPerspective,
                            parentExecutionId: exId,
                        });
                        const pending =
                            String(row.executorOutcome ?? 'pending') === 'pending' ||
                            String(row.executorOutcome ?? '') === '';
                        const bodyPreview = formatRequestBodyPreview(String(row.body ?? ''));

                        return (
                            <div
                                key={decisionId}
                                className="overflow-hidden rounded-2xl border border-emerald-500/15 bg-[#0A0F1C]/60 text-right"
                            >
                                <div className="flex flex-row-reverse items-start justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-3 py-2.5">
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                        <p className="text-[12px] font-black text-emerald-50">{title}</p>
                                        {requestDate ? (
                                            <p className="text-[10px] text-slate-500">
                                                تاريخ الطلب: {requestDate}
                                            </p>
                                        ) : null}
                                    </div>
                                    <span
                                        className={`shrink-0 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${statusToneClass(row)}`}
                                    >
                                        {statusLabel}
                                    </span>
                                </div>

                                <div className="px-3 py-2.5">
                                    <p className="text-[9px] font-bold text-emerald-200/75">
                                        تفاصيل الطلب
                                    </p>
                                    <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-200">
                                        {bodyPreview}
                                    </p>
                                </div>

                                {pending ? (
                                    <div className="border-t border-white/10 px-3 py-2.5 space-y-2">
                                        <p className="flex flex-row-reverse items-center gap-1.5 text-[9px] font-bold text-amber-200/90">
                                            <Gavel size={12} />
                                            قرار المنفذ العدل
                                        </p>
                                        <ExecutionInlineExecutorDecisionActions
                                            executionId={exId}
                                            decisionId={decisionId}
                                            decisionRow={row}
                                            requestKind="special_followup"
                                        />
                                    </div>
                                ) : null}

                                {showExecutorStrip && !pending ? (
                                    <div className="border-t border-white/10 px-3 py-2.5">
                                        <ExecutorDecisionFollowupMirror
                                            executionId={exId}
                                            row={row}
                                            requestKind="special_followup"
                                            appealPerspective={appealPerspective}
                                        />
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
