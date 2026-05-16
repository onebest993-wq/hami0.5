import React, { useMemo, useState } from 'react';
import { Send, CheckCircle, Clock, Plus } from 'lucide-react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
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
}

const COMMUNICATION_KEYWORD = 'إرسال كتاب / مخاطبة جهة';

function isCommunicationDecision(decision: any): boolean {
    const t = String(decision?.title || '');
    return t.includes(COMMUNICATION_KEYWORD) || /مخاطبة جهة/i.test(t);
}

function hasResult(decision: any): boolean {
    return Boolean(decision?.deputationResultDetails) || decision?.deputationClosed === true;
}

export const CommunicationsTab: React.FC<CommunicationsTabProps> = ({
    decisionsStorageExecutionId,
    showToast,
    pushTimelineEvent,
    nextTimelineId,
}) => {
    const [targetDirectorate, setTargetDirectorate] = useState('');
    const [requestDate, setRequestDate] = useState(getLocalTodayYmd());
    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [resultDraftById, setResultDraftById] = useState<
        Record<string, { purpose: string; letterNum: string; letterDate: string; result: string }>
    >({});

    const { executionId: exId, decisions } = useExecutorDecisions(decisionsStorageExecutionId);

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

    const awaitingResultAfterApproval = useMemo(() => {
        return commDecisions.filter((d: any) => isExecutorRowEffectivelyApproved(d) && !hasResult(d));
    }, [commDecisions]);

    const completedDecisions = useMemo(() => {
        return commDecisions.filter((d: any) => hasResult(d));
    }, [commDecisions]);

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
                title: `${COMMUNICATION_KEYWORD} — قيد البت`,
                description: `إرسال كتاب إلى: ${targetDirectorate.trim()} — تاريخ ${requestDate.trim()}`,
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

    const openAppeals = (decisionId: string) => {
        if (!exId || !decisionId) return;
        try {
            window.dispatchEvent(
                new CustomEvent('hami-open-decisions-modal', {
                    detail: { executionId: exId, tab: 'appeals', decisionId },
                })
            );
        } catch {
            /* ignore */
        }
    };

    const renderCommunicationCard = (decision: any) => {
        const decisionId = String(decision?.id || '').trim();
        const title = String(decision?.title || '').trim() || COMMUNICATION_KEYWORD;
        const directorate = extractDirectorate(title);
        const rejected = isExecutorRowRejectedAndFinal(decision);
        const approved = isExecutorRowEffectivelyApproved(decision);
        const pending = String(decision?.executorOutcome ?? 'pending') === 'pending' || String(decision?.executorOutcome ?? '') === '';
        const hasRes = hasResult(decision);
        const draft =
            resultDraftById[decisionId] || { purpose: directorate, letterNum: '', letterDate: '', result: '' };
        const canSaveResult = approved && !rejected && !hasRes && Boolean(String(draft.result || '').trim());

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
                    : approved && !rejected
                      ? 'بانتظار إدخال النتيجة'
                      : 'مقفلة حتى موافقة المنفذ',
                status: hasRes ? 'done' : approved && !rejected ? 'active' : 'locked',
                tone: hasRes ? 'success' : 'neutral',
                content:
                    approved && !rejected && !hasRes ? (
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
                                        pushTimelineEvent({
                                            id: nextTimelineId(),
                                            type: 'communication',
                                            title: `📨 ورود نتيجة مخاطبة — ${title}`,
                                            description: `وردت نتيجة مخاطبة ${title}: ${String(draft.result || '').trim()}`,
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
                        <div className="rounded-xl border border-white/10 bg-black/20 p-2 text-right">
                            <p className="text-[10px] text-slate-300">النتيجة:</p>
                            <p className="mt-1 text-[11px] text-slate-100 whitespace-pre-wrap">
                                {String(decision?.deputationResultDetails || '—')}
                            </p>
                        </div>
                    ) : null,
            } satisfies ExecutionInlineStep,
        ];

        return (
            <div key={decisionId} className="rounded-2xl border border-white/10 bg-black/15 p-3">
                <ExecutionInlineAccordion steps={steps} />
            </div>
        );
    };

    return (
        <div className="space-y-5 p-3 text-right" dir="rtl">
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

            <div className="space-y-2">
                <h4 className="flex items-center gap-1.5 text-[11px] font-bold text-amber-200 mb-2 px-1">
                    <Clock size={14} />
                    طلبات بانتظار قرار المنفذ
                    {awaitingExecutor.length > 0 ? (
                        <span className="text-[9px] text-slate-500 font-normal">({awaitingExecutor.length})</span>
                    ) : null}
                </h4>
                {awaitingExecutor.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-500 rounded-xl border border-dashed border-white/5">
                        <Clock size={24} className="opacity-30 mb-2" />
                        <p className="text-[10px]">لا توجد طلبات معلّقة</p>
                    </div>
                ) : (
                    <div className="space-y-2">{awaitingExecutor.map(renderCommunicationCard)}</div>
                )}
            </div>

            <div className="space-y-2">
                <h4 className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-200 mb-2 px-1">
                    <Plus size={14} />
                    بعد الموافقة — إدخال النتيجة
                    {awaitingResultAfterApproval.length > 0 ? (
                        <span className="text-[9px] text-slate-500 font-normal">({awaitingResultAfterApproval.length})</span>
                    ) : null}
                </h4>
                {awaitingResultAfterApproval.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-500 rounded-xl border border-dashed border-white/5">
                        <CheckCircle size={24} className="opacity-30 mb-2" />
                        <p className="text-[10px]">لا توجد مخاطبات تنتظر نتيجة</p>
                    </div>
                ) : (
                    <div className="space-y-2">{awaitingResultAfterApproval.map(renderCommunicationCard)}</div>
                )}
            </div>

            <div className="space-y-2">
                <h4 className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-200 mb-2 px-1">
                    <CheckCircle size={14} />
                    سجل المخاطبات المكتملة
                    {completedDecisions.length > 0 ? (
                        <span className="text-[9px] text-slate-500 font-normal">({completedDecisions.length})</span>
                    ) : null}
                </h4>
                {completedDecisions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-500 rounded-xl border border-dashed border-white/5">
                        <CheckCircle size={24} className="opacity-30 mb-2" />
                        <p className="text-[10px]">لا توجد مخاطبات سابقة</p>
                    </div>
                ) : (
                    <div className="space-y-2">{completedDecisions.map(renderCommunicationCard)}</div>
                )}
            </div>
        </div>
    );
};
