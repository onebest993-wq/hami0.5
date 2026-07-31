import React from 'react';
import {
    isExecutorRowRejectedAndFinal,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import {
    COMMUNICATION_KEYWORD,
    buildCommunicationDisplayContext,
    extractDirectorate,
    hasResult,
} from './communicationDecisionModel';
import { CommunicationContextPanel } from './CommunicationContextPanel';

    export function CommunicationExecutorInlineCard({
    decision,
    decisionRows,
    exId,
    saving,
    setSaving,
    resultDraftById,
    setResultDraftById,
    showToast,
    pushTimelineEvent,
    nextTimelineId,
    openAppeals,
}: {
    decision: any;
    decisionRows: Record<string, unknown>[];
    exId: string;
    saving: boolean;
    setSaving: (v: boolean) => void;
    resultDraftById: Record<string, { purpose: string; letterNum: string; letterDate: string; result: string }>;
    setResultDraftById: React.Dispatch<React.SetStateAction<Record<string, { purpose: string; letterNum: string; letterDate: string; result: string }>>>;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    pushTimelineEvent: (event: any) => void;
    nextTimelineId: () => string;
    openAppeals: (decisionId: string) => void;
}) {

        const decisionId = String(decision?.id || '').trim();
        const title = String(decision?.title || '').trim() || COMMUNICATION_KEYWORD;
        const directorate = extractDirectorate(title);
        const rejected = isExecutorRowRejectedAndFinal(decision);
        const approved = isExecutorRowApprovedWorkflowActive(decision, decisionRows);
        const pending = String(decision?.executorOutcome ?? 'pending') === 'pending' || String(decision?.executorOutcome ?? '') === '';
        const hasRes = hasResult(decision);
        const draft =
            resultDraftById[decisionId] || { purpose: directorate, letterNum: '', letterDate: '', result: '' };
        const delivered = decision?.deputationSent === true;
        const canSaveResult =
            approved && !rejected && !hasRes && delivered && Boolean(String(draft.result || '').trim());

        const markDelivered = () => {
            if (!exId || !decisionId || saving) return;
            setSaving(true);
            try {
                patchExecutorDecisionRow(exId, decisionId, { deputationSent: true } as any);
                showToast('تم تسجيل التسليم', 'success');
            } catch {
                showToast('تعذّر تسجيل التسليم', 'error');
            }
            setSaving(false);
        };

        const steps: ExecutionInlineStep[] = [
            {
                id: `${decisionId}:sent`,
                title: 'طلب مخاطبة جهة',
                subtitle: `الجهة: ${directorate}`,
                status: 'done',
                tone: 'success',
            },
            {
                id: `${decisionId}:executor`,
                title: 'قرار المنفذ',
                subtitle: rejected ? 'تم رفض الطلب' : approved ? 'تمت الموافقة' : pending ? 'قيد البت' : '—',
                status: rejected || pending ? 'active' : 'done',
                tone: rejected ? 'danger' : approved ? 'success' : 'neutral',
                content: rejected ? (
                    <ExecutionInlineExecutorDecisionActions
                        executionId={exId}
                        decisionId={decisionId}
                        requestKind={String(decision?.requestKind || 'special_followup')}
                        disabled
                        onOpenAppealCenter={() => openAppeals(decisionId)}
                    />
                ) : pending ? (
                    <ExecutionInlineExecutorDecisionActions
                        executionId={exId}
                        decisionId={decisionId}
                        requestKind={String(decision?.requestKind || 'special_followup')}
                    />
                ) : null,
            },
            {
                id: `${decisionId}:result`,
                title: 'تسجيل نتيجة المخاطبة',
                subtitle: hasRes
                    ? 'تم تسجيل النتيجة'
                    : approved && !rejected && delivered
                      ? 'بانتظار إدخال النتيجة'
                      : approved && !rejected
                        ? 'بانتظار تأكيد التسليم'
                        : 'مقفلة حتى موافقة المنفذ',
                status: hasRes
                    ? 'done'
                    : approved && !rejected && delivered
                      ? 'active'
                      : 'locked',
                tone: hasRes ? 'success' : 'neutral',
                content:
                    approved && !rejected && !hasRes && delivered ? (
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={draft.purpose}
                                onChange={(e) =>
                                    setResultDraftById((prev) => ({
                                        ...prev,
                                        [decisionId]: { ...draft, purpose: e.target.value },
                                    }))
                                }
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100 text-right"
                                placeholder="الجهة المخاطبة"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="date"
                                    value={draft.letterDate}
                                    onChange={(e) =>
                                        setResultDraftById((prev) => ({
                                            ...prev,
                                            [decisionId]: { ...draft, letterDate: e.target.value },
                                        }))
                                    }
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100"
                                />
                                <input
                                    type="text"
                                    value={draft.letterNum}
                                    onChange={(e) =>
                                        setResultDraftById((prev) => ({
                                            ...prev,
                                            [decisionId]: { ...draft, letterNum: e.target.value },
                                        }))
                                    }
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100 text-right"
                                    placeholder="رقم الكتاب"
                                />
                            </div>
                            <textarea
                                value={draft.result}
                                onChange={(e) =>
                                    setResultDraftById((prev) => ({
                                        ...prev,
                                        [decisionId]: { ...draft, result: e.target.value },
                                    }))
                                }
                                rows={3}
                                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100 text-right"
                                placeholder="تفاصيل النتيجة الواردة"
                            />
                            <button
                                type="button"
                                disabled={!canSaveResult || saving}
                                onClick={() => {
                                    if (!canSaveResult || saving) return;
                                    setSaving(true);
                                    const now = new Date().toISOString();
                                    const ref = [
                                        String(draft.letterDate || '').trim(),
                                        String(draft.letterNum || '').trim(),
                                    ]
                                        .filter(Boolean)
                                        .join(' ');
                                    patchExecutorDecisionRow(exId, decisionId, {
                                        deputationTargetDirectorate: String(draft.purpose || '').trim(),
                                        deputationReferralDate: ref || undefined,
                                        deputationResultDetails: String(draft.result || '').trim(),
                                        deputationClosed: true,
                                    } as any);
                                    try {
                                        const ref = [
                                            String(draft.letterDate || '').trim(),
                                            String(draft.letterNum || '').trim(),
                                        ]
                                            .filter(Boolean)
                                            .join(' · ');
                                        pushTimelineEvent({
                                            id: nextTimelineId(),
                                            type: 'communication',
                                            title: `نتيجة مخاطبة — ${directorate}`,
                                            description: [
                                                ref ? `مرجع: ${ref}` : '',
                                                String(draft.result || '').trim(),
                                            ]
                                                .filter(Boolean)
                                                .join('\n'),
                                            date: now.slice(0, 10),
                                            timestamp: now,
                                            source: 'محضر المتابعة',
                                        });
                                    } catch {
                                        /* ignore */
                                    }
                                    setSaving(false);
                                    showToast('✅ تم حفظ النتيجة الواردة', 'success');
                                }}
                                className="w-full rounded-xl bg-emerald-700/70 py-2.5 text-[11px] font-black text-white disabled:opacity-40"
                            >
                                حفظ النتيجة
                            </button>
                        </div>
                    ) : hasRes ? (
                        <CommunicationContextPanel ctx={buildCommunicationDisplayContext(decision, decisionRows)} compact />
                    ) : null,
            } satisfies ExecutionInlineStep,
        ];

        return (
            <div key={decisionId} className="rounded-2xl border border-white/10 bg-black/15 p-3">
                {approved && !rejected && !hasRes ? (
                    <div className="mb-3 flex justify-end">
                        {!delivered ? (
                            <button
                                type="button"
                                disabled={saving}
                                onClick={markDelivered}
                                className="rounded-xl border border-cyan-500/35 bg-cyan-500/10 px-3 py-2 text-[11px] font-extrabold text-cyan-200 hover:bg-cyan-500/15 disabled:opacity-40"
                            >
                                تم التسليم
                            </button>
                        ) : (
                            <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-extrabold text-emerald-200">
                                تمت الإجابة
                            </span>
                        )}
                    </div>
                ) : null}
                <ExecutionInlineAccordion steps={steps} />
            </div>
        );
}
