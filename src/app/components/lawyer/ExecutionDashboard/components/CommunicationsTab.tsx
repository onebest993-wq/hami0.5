import React, { useMemo, useState } from 'react';
import { Send, CheckCircle, Clock, Plus } from 'lucide-react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
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
import { LegalEntitySoftProceduresSection } from '@/app/components/lawyer/ExecutionDashboard/components/LegalEntitySoftProceduresSection';
import type { InlineActionGateKey } from '@/app/components/lawyer/ExecutionDashboard/types';
import { useExecutorDecisions } from '@/app/components/lawyer/ExecutionDashboard/hooks/useExecutorDecisions';

export interface CommunicationsTabProps {
    decisionsStorageExecutionId: string;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    pushTimelineEvent: (event: {
        id: string;
        type: string;
        title: string;
        description: string;
        date: string;
        timestamp?: string;
        source?: string;
        metadata?: Record<string, unknown>;
    }) => void;
    nextTimelineId: () => string;
    showSoftFieldProcedures?: boolean;
    showEncroachmentSurveyor?: boolean;
    showSpecificDeliverySurveyor?: boolean;
    inlineActionGateKey?: InlineActionGateKey | null;
    setInlineActionGateKey?: (key: InlineActionGateKey | null) => void;
    onEncroachmentExpenseRecorded?: (
        row: import('@/app/utils/encroachmentRemovalRequests').EncroachmentCaseExpenseRow
    ) => void;
}

const COMMUNICATION_KEYWORD = 'إرسال كتاب / مخاطبة جهة';

function isCommunicationDecision(decision: any): boolean {
    const t = String(decision?.title || '');
    return t.includes(COMMUNICATION_KEYWORD) || /مخاطبة جهة/i.test(t);
}

function hasResult(decision: any): boolean {
    return Boolean(decision?.deputationResultDetails) || decision?.deputationClosed === true;
}

function isCommunicationFollowupComplete(decision: any): boolean {
    return hasResult(decision) || isFollowupDismissed(decision) || isNoResponseConfirmed(decision);
}

function isFollowupDismissed(decision: any): boolean {
    return decision?.deputationFollowupDismissed === true;
}

function isNoResponseConfirmed(decision: any): boolean {
    return decision?.deputationNoResponseConfirmed === true;
}

function isAwaitingCommunicationResult(decision: any, decisionRows: Record<string, unknown>[]): boolean {
    const rejected = isExecutorRowRejectedAndFinal(decision);
    const approved = isExecutorRowApprovedWorkflowActive(decision, decisionRows);
    return approved && !rejected && !isCommunicationFollowupComplete(decision);
}

type CommunicationDisplayContext = {
    directorate: string;
    statusLabel: string;
    statusTone: 'success' | 'warning' | 'danger' | 'neutral' | 'muted';
    requestDate: string;
    referenceLabel: string;
    outcomeTitle: string;
    outcomeBody: string;
};

function buildCommunicationDisplayContext(
    decision: any,
    decisionRows: Record<string, unknown>[],
): CommunicationDisplayContext {
    const title = String(decision?.title || '').trim() || COMMUNICATION_KEYWORD;
    const directorateFromTitle = title.includes('— ')
        ? title.split('— ').slice(1).join('— ').trim()
        : title;
    const directorate =
        String(decision?.deputationTargetDirectorate || '').trim() || directorateFromTitle;
    const rejected = isExecutorRowRejectedAndFinal(decision);
    const approved = isExecutorRowApprovedWorkflowActive(decision, decisionRows);
    const pending =
        String(decision?.executorOutcome ?? 'pending') === 'pending' ||
        String(decision?.executorOutcome ?? '') === '';
    const dismissed = isFollowupDismissed(decision);
    const noResponse = isNoResponseConfirmed(decision);
    const hasRes = hasResult(decision);
    const requestDate = String(decision?.date || decision?.resolvedAt || '').trim().slice(0, 10);
    const referenceLabel = String(decision?.deputationReferralDate || '').trim();

    let statusLabel = '—';
    let statusTone: CommunicationDisplayContext['statusTone'] = 'neutral';
    if (rejected) {
        statusLabel = 'مرفوض';
        statusTone = 'danger';
    } else if (pending) {
        statusLabel = 'قيد البت';
        statusTone = 'warning';
    } else if (approved) {
        if (hasRes && String(decision?.deputationResultDetails || '').trim()) {
            statusLabel = 'مكتمل';
            statusTone = 'success';
        } else if (dismissed) {
            statusLabel = 'موافق — مُتجاهَل';
            statusTone = 'muted';
        } else if (noResponse) {
            statusLabel = 'موافق — عدم ورود إجابة';
            statusTone = 'warning';
        } else {
            statusLabel = 'موافق — بانتظار النتيجة';
            statusTone = 'warning';
        }
    }

    let outcomeTitle = 'مضمون الإجابة';
    let outcomeBody = String(decision?.deputationResultDetails || '').trim();
    if (noResponse) {
        outcomeTitle = 'النتيجة';
        outcomeBody =
            outcomeBody ||
            'تم التأكيد — عدم ورود إجابة من الجهة المخاطبة.';
    } else if (dismissed) {
        outcomeTitle = 'المتابعة';
        outcomeBody = outcomeBody || 'تم تجاهل متابعة نتيجة المخاطبة.';
    } else if (rejected) {
        outcomeTitle = 'ملاحظة';
        outcomeBody =
            String(decision?.executorNote || decision?.body || '').trim() ||
            'تم رفض الطلب من قبل المنفذ.';
    } else if (!outcomeBody) {
        outcomeTitle = 'تفاصيل الطلب';
        outcomeBody = String(decision?.body || '').trim() || '—';
    }

    return {
        directorate,
        statusLabel,
        statusTone,
        requestDate,
        referenceLabel,
        outcomeTitle,
        outcomeBody,
    };
}

const STATUS_TONE_CLASS: Record<CommunicationDisplayContext['statusTone'], string> = {
    success: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-100',
    warning: 'border-amber-500/35 bg-amber-500/10 text-amber-100',
    danger: 'border-rose-500/35 bg-rose-500/10 text-rose-100',
    neutral: 'border-slate-500/35 bg-slate-500/10 text-slate-200',
    muted: 'border-slate-600/35 bg-slate-800/50 text-slate-400',
};

export const CommunicationsTab: React.FC<CommunicationsTabProps> = ({
    decisionsStorageExecutionId,
    showToast,
    pushTimelineEvent,
    nextTimelineId,
    showSoftFieldProcedures = false,
    showEncroachmentSurveyor = false,
    showSpecificDeliverySurveyor = false,
    inlineActionGateKey = null,
    setInlineActionGateKey,
    onEncroachmentExpenseRecorded,
}) => {
    const [targetDirectorate, setTargetDirectorate] = useState('');
    const [requestDate, setRequestDate] = useState(getLocalTodayYmd());
    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [resultDraftById, setResultDraftById] = useState<
        Record<string, { purpose: string; letterNum: string; letterDate: string; result: string }>
    >({});
    const [awaitingUiById, setAwaitingUiById] = useState<
        Record<string, { confirmingNoResponse?: boolean; responseFormOpen?: boolean }>
    >({});

    const { executionId: exId, decisions } = useExecutorDecisions(decisionsStorageExecutionId);
    const decisionRows = useMemo(
        () => (Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : []),
        [decisions]
    );

    const commDecisions = useMemo(() => {
        const list = Array.isArray(decisions) ? decisions : [];
        return list
            .filter((d: any) => isCommunicationDecision(d))
            .sort((a: any, b: any) => {
                const da = String(a?.resolvedAt ?? a?.date ?? '');
                const db = String(b?.resolvedAt ?? b?.date ?? '');
                return db.localeCompare(da, undefined, { numeric: true });
            });
    }, [decisions]);

    const awaitingExecutor = useMemo(() => {
        return commDecisions.filter((d: any) => {
            const out = String(d?.executorOutcome ?? 'pending');
            return out === 'pending' || out === '';
        });
    }, [commDecisions]);

    const awaitingResultDecisions = useMemo(() => {
        return commDecisions.filter((d: any) => isAwaitingCommunicationResult(d, decisionRows));
    }, [commDecisions, decisionRows]);

    const logDecisions = useMemo(() => {
        return commDecisions.filter((d: any) => {
            const out = String(d?.executorOutcome ?? 'pending');
            if (out === 'pending' || out === '') return false;
            return !isAwaitingCommunicationResult(d, decisionRows);
        });
    }, [commDecisions, decisionRows]);

    /** إنشاء طلب مخاطبة جديد */
    const handleCreate = async () => {
        if (!targetDirectorate.trim()) {
            showToast('يرجى إدخال اسم الجهة المُخاطبة', 'warning');
            return;
        }
        if (!requestDate.trim()) {
            showToast('يرجى إدخال تاريخ الطلب', 'warning');
            return;
        }
        setCreating(true);

        try {
            const { appendSpecialFollowupRequest } = await import('@/app/utils/executorSeizureDecisionQueue');
            const title = `${COMMUNICATION_KEYWORD} — ${targetDirectorate.trim()}`;
            const decisionId = appendSpecialFollowupRequest({
                executionId: exId,
                requestDate: requestDate.trim(),
                content: `مخاطبة جهة: ${targetDirectorate.trim()}`,
                decisionTitle: title,
            });

            if (!decisionId) {
                showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning');
                setCreating(false);
                return;
            }

            const now = new Date().toISOString();
            pushTimelineEvent({
                id: nextTimelineId(),
                type: 'communication',
                title: `مخاطبة: ${targetDirectorate.trim()}`,
                description: `طلب مخاطبة جهة — ${requestDate.trim()} — قيد البت لدى المنفذ`,
                date: requestDate.trim(),
                timestamp: now,
                source: 'محضر المتابعة',
                metadata: { timelineThreadKey: `executor_decision:${decisionId}`, decisionRowId: decisionId },
            });

            setTargetDirectorate('');
            setRequestDate(getLocalTodayYmd());
            showToast('تم إنشاء الطلب — قرار المنفذ يظهر هنا مباشرة.', 'success');
        } catch {
            showToast('فشل إنشاء الطلب', 'error');
        }
        setCreating(false);
    };

    const extractDirectorate = (title: string): string => {
        const parts = title.split('— ');
        return parts.length > 1 ? parts[1].trim() : title;
    };

    const renderCommunicationContextPanel = (
        ctx: CommunicationDisplayContext,
        opts?: { compact?: boolean },
    ) => {
        const compact = opts?.compact === true;
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
                        <p className="text-[9px] font-bold text-slate-500">مرجع الإجابة</p>
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
    };

    const openAppeals = (decisionId: string) => {
        if (!exId || !decisionId) return;
        try {
            window.dispatchEvent(
                new CustomEvent('hami-open-decisions-modal', {
                    detail: { executionId: exId, tab: 'previous', decisionId },
                })
            );
        } catch {
            /* ignore */
        }
    };

    const renderCommunicationLogEntry = (decision: any) => {
        const decisionId = String(decision?.id || '').trim();
        const ctx = buildCommunicationDisplayContext(decision, decisionRows);

        return (
            <div
                key={decisionId}
                className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-right space-y-2"
            >
                <div className="space-y-1">
                    <p className="text-[12px] font-black text-slate-50">{ctx.directorate}</p>
                    <p className="text-[10px] text-slate-500">إرسال كتاب / مخاطبة جهة</p>
                </div>
                {renderCommunicationContextPanel(ctx)}
            </div>
        );
    };

    const saveCommunicationResult = (
        decisionId: string,
        directorate: string,
        draft: { purpose: string; letterNum: string; letterDate: string; result: string },
    ) => {
        if (!exId || !decisionId || saving) return;
        if (!String(draft.result || '').trim()) {
            showToast('أدخل مضمون الإجابة', 'warning');
            return;
        }
        setSaving(true);
        const now = new Date().toISOString();
        const ref = [String(draft.letterDate || '').trim(), String(draft.letterNum || '').trim()]
            .filter(Boolean)
            .join(' ');
        patchExecutorDecisionRow(exId, decisionId, {
            deputationTargetDirectorate: String(draft.purpose || '').trim(),
            deputationReferralDate: ref || undefined,
            deputationResultDetails: String(draft.result || '').trim(),
            deputationClosed: true,
            deputationSent: true,
        } as any);
        try {
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
        setAwaitingUiById((prev) => {
            const next = { ...prev };
            delete next[decisionId];
            return next;
        });
        setSaving(false);
        showToast('✅ تم حفظ النتيجة الواردة', 'success');
    };

    const renderAwaitingResultCard = (decision: any) => {
        const decisionId = String(decision?.id || '').trim();
        const ctx = buildCommunicationDisplayContext(decision, decisionRows);
        const ui = awaitingUiById[decisionId] || {};
        const draft =
            resultDraftById[decisionId] || {
                purpose: ctx.directorate,
                letterNum: '',
                letterDate: '',
                result: '',
            };
        const showActionButtons = !ui.confirmingNoResponse;

        const dismissFollowup = () => {
            if (!exId || !decisionId || saving) return;
            setSaving(true);
            try {
                patchExecutorDecisionRow(exId, decisionId, {
                    deputationFollowupDismissed: true,
                    deputationClosed: true,
                    deputationResultDetails: 'تم تجاهل متابعة نتيجة المخاطبة.',
                } as any);
                setAwaitingUiById((prev) => {
                    const next = { ...prev };
                    delete next[decisionId];
                    return next;
                });
                showToast('تم تجاهل متابعة النتيجة', 'info');
            } catch {
                showToast('تعذّر التجاهل', 'error');
            }
            setSaving(false);
        };

        const confirmNoResponse = () => {
            if (!exId || !decisionId || saving) return;
            setSaving(true);
            try {
                patchExecutorDecisionRow(exId, decisionId, {
                    deputationNoResponseConfirmed: true,
                    deputationClosed: true,
                    deputationResultDetails:
                        'تم التأكيد — عدم ورود إجابة من الجهة المخاطبة.',
                } as any);
                const now = new Date().toISOString();
                pushTimelineEvent({
                    id: nextTimelineId(),
                    type: 'communication',
                    title: `تأكيد — عدم ورود إجابة — ${ctx.directorate}`,
                    description: 'تم التأكيد — عدم ورود إجابة من الجهة المخاطبة.',
                    date: now.slice(0, 10),
                    timestamp: now,
                    source: 'محضر المتابعة',
                    metadata: { timelineThreadKey: `executor_decision:${decisionId}` },
                });
                setAwaitingUiById((prev) => {
                    const next = { ...prev };
                    delete next[decisionId];
                    return next;
                });
                showToast('تم تسجيل عدم ورود الإجابة', 'success');
            } catch {
                showToast('تعذّر التسجيل', 'error');
            }
            setSaving(false);
        };

        return (
            <div
                key={decisionId}
                className="rounded-2xl border border-white/10 bg-black/15 px-3 py-3 text-right space-y-3"
            >
                <div className="space-y-1">
                    <p className="text-[12px] font-black text-slate-50">{ctx.directorate}</p>
                    <p className="text-[10px] text-slate-500">مخاطبة بانتظار النتيجة</p>
                </div>

                {renderCommunicationContextPanel(ctx, { compact: true })}

                {ui.confirmingNoResponse ? (
                    <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 px-3 py-2.5 space-y-2">
                        <p className="text-[11px] font-bold text-amber-100">
                            تأكيد عدم ورود إجابة من «{ctx.directorate}»؟
                        </p>
                        <p className="text-[10px] leading-relaxed text-amber-100/80">
                            سيُسجَّل في سجل المخاطبات بنفس سياق البطاقة العادية.
                        </p>
                        <div className="flex flex-row-reverse flex-wrap gap-2">
                            <button
                                type="button"
                                disabled={saving}
                                onClick={confirmNoResponse}
                                className="rounded-xl border border-amber-500/40 bg-amber-600/20 px-3 py-2 text-[11px] font-black text-amber-100 disabled:opacity-40"
                            >
                                تأكيد
                            </button>
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() =>
                                    setAwaitingUiById((prev) => ({
                                        ...prev,
                                        [decisionId]: {
                                            ...prev[decisionId],
                                            confirmingNoResponse: false,
                                        },
                                    }))
                                }
                                className="rounded-xl bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-100 disabled:opacity-40"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                ) : showActionButtons ? (
                    <div className="flex flex-row-reverse flex-wrap gap-2">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                                setAwaitingUiById((prev) => ({
                                    ...prev,
                                    [decisionId]: {
                                        ...prev[decisionId],
                                        confirmingNoResponse: true,
                                        responseFormOpen: false,
                                    },
                                }))
                            }
                            className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[10px] font-bold text-amber-100 hover:bg-amber-500/15 disabled:opacity-40"
                        >
                            عدم ورود الإجابة
                        </button>
                        <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                                setAwaitingUiById((prev) => ({
                                    ...prev,
                                    [decisionId]: {
                                        ...prev[decisionId],
                                        responseFormOpen: !prev[decisionId]?.responseFormOpen,
                                        confirmingNoResponse: false,
                                    },
                                }))
                            }
                            className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-[10px] font-bold text-emerald-100 hover:bg-emerald-500/15 disabled:opacity-40"
                        >
                            تم ورود الإجابة
                        </button>
                        <button
                            type="button"
                            disabled={saving}
                            onClick={dismissFollowup}
                            className="rounded-xl border border-slate-500/35 bg-slate-800/60 px-3 py-2 text-[10px] font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                        >
                            التجاهل
                        </button>
                    </div>
                ) : null}

                {ui.responseFormOpen && showActionButtons ? (
                    <div className="space-y-2 border-t border-white/10 pt-2">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="mb-1 block text-[9px] text-slate-500">تاريخ الإجابة</label>
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
                            </div>
                            <div>
                                <label className="mb-1 block text-[9px] text-slate-500">رقم الكتاب</label>
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
                        </div>
                        <div>
                            <label className="mb-1 block text-[9px] text-slate-500">مضمون الإجابة</label>
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
                                placeholder="مضمون الإجابة الواردة"
                            />
                        </div>
                        <button
                            type="button"
                            disabled={saving || !String(draft.result || '').trim()}
                            onClick={() => saveCommunicationResult(decisionId, ctx.directorate, draft)}
                            className="w-full rounded-xl bg-emerald-700/70 py-2.5 text-[11px] font-black text-white disabled:opacity-40"
                        >
                            حفظ
                        </button>
                    </div>
                ) : null}
            </div>
        );
    };

    const renderCommunicationCard = (decision: any) => {
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
                        renderCommunicationContextPanel(
                            buildCommunicationDisplayContext(decision, decisionRows),
                            { compact: true },
                        )
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
    };

    return (
        <div className="space-y-5 p-3 text-right" dir="rtl">
            {showSoftFieldProcedures && setInlineActionGateKey ? (
                <LegalEntitySoftProceduresSection
                    decisionsStorageExecutionId={decisionsStorageExecutionId}
                    inlineActionGateKey={inlineActionGateKey}
                    setInlineActionGateKey={setInlineActionGateKey}
                    showToast={showToast}
                    showEncroachmentSurveyor={showEncroachmentSurveyor}
                    showSpecificDeliverySurveyor={showSpecificDeliverySurveyor}
                    onEncroachmentExpenseRecorded={onEncroachmentExpenseRecorded}
                />
            ) : null}
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/15 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Send size={16} className="text-indigo-400" />
                    <h4 className="text-[11px] font-bold text-indigo-200">إرسال كتاب / مخاطبة جهة</h4>
                </div>

                <div className="mb-3">
                    <label className="mb-1 block text-[9px] text-slate-400">إلى الجهة المُخاطبة *</label>
                    <input
                        type="text"
                        value={targetDirectorate}
                        onChange={(e) => setTargetDirectorate(e.target.value)}
                        placeholder="أدخل اسم الدائرة أو الجهة..."
                        className="w-full bg-black/30 border border-white/10 text-white rounded-xl p-3 text-[11px] focus:outline-none focus:border-indigo-500/50 placeholder:text-white/20"
                    />
                </div>

                <div className="mb-3">
                    <label className="mb-1 block text-[9px] text-slate-400">تاريخ الطلب</label>
                    <input
                        type="date"
                        value={requestDate}
                        onChange={(e) => setRequestDate(e.target.value)}
                        max={new Date().toISOString().slice(0, 10)}
                        dir="rtl"
                        className="w-full bg-black/30 border border-white/10 text-white rounded-xl p-3 text-[11px] focus:outline-none focus:border-indigo-500/50 [&::-webkit-calendar-picker-indicator]:invert"
                    />
                </div>

                <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600/80 text-white hover:bg-indigo-600 rounded-xl font-bold text-[11px] border border-indigo-500/30 transition-all disabled:opacity-50"
                >
                    {creating ? 'جاري الإنشاء...' : (
                        <>
                            <Plus size={16} /> إنشاء الطلب
                        </>
                    )}
                </button>
            </div>

            {awaitingExecutor.length > 0 ? (
                <div className="space-y-2">
                    <h4 className="flex items-center gap-1.5 text-[11px] font-bold text-amber-200 mb-2 px-1">
                        <Clock size={14} />
                        طلبات بانتظار قرار المنفذ
                        <span className="text-[9px] text-slate-500 font-normal">({awaitingExecutor.length})</span>
                    </h4>
                    <div className="space-y-2">{awaitingExecutor.map(renderCommunicationCard)}</div>
                </div>
            ) : null}

            {awaitingResultDecisions.length > 0 ? (
                <div className="space-y-2">
                    <h4 className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-200 mb-2 px-1">
                        <Clock size={14} />
                        مخاطبات بانتظار النتيجة
                        <span className="text-[9px] text-slate-500 font-normal">
                            ({awaitingResultDecisions.length})
                        </span>
                    </h4>
                    <div className="space-y-2">{awaitingResultDecisions.map(renderAwaitingResultCard)}</div>
                </div>
            ) : null}

            <div className="space-y-2">
                <h4 className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-200 mb-2 px-1">
                    <CheckCircle size={14} />
                    سجل المخاطبات
                    {logDecisions.length > 0 ? (
                        <span className="text-[9px] text-slate-500 font-normal">({logDecisions.length})</span>
                    ) : null}
                </h4>
                {logDecisions.length === 0 ? (
                    <p className="px-1 text-[10px] text-slate-500">لا توجد مخاطبات في السجل بعد.</p>
                ) : (
                    <div className="space-y-2">{logDecisions.map(renderCommunicationLogEntry)}</div>
                )}
            </div>
        </div>
    );
};
