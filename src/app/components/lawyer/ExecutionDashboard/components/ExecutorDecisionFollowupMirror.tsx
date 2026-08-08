// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    isExecutorHubRowSuperseded,
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    hubWithInferredAppealOrigin,
    isCreditorInitiatedExecutorRequest,
    resolveExecutorRequestFollowupBlockFromRecord,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import { isExecutorRejectedAppealFollowupDismissed } from '@/app/utils/personalCoerciveAppealSync';
import { isExecutorDecisionRowEffectivelyEnforced } from '@/app/utils/executorRequestAppealSync';
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import {
    ExecutorRequestFollowupBlockPanel,
    WaiveInitialAppealButton,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/decisionCardPresentation';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import { ExecutionInlineExecutorDecisionActions } from './ExecutionInlineAccordion';
import { isDossierControlDecisionSettled } from '../utils/dossierControlDecisions';
export type ExecutorDecisionFollowupMirrorProps = {
    executionId: string | undefined;
    row: Record<string, unknown> | null;
    requestKind?: string;
    personalCoerciveSubtype?: string;
    className?: string;
    /** داخل ExecutionInlineAccordion — العنوان في رأس الخطوة، لا تكرار هنا */
    compact?: boolean;
    onResubmitRequest?: () => void;
    resubmitSubmitting?: boolean;
    disabled?: boolean;
    onWaiveInitialAppealApplied?: (result: {
        ok: boolean;
        mergedRowId?: string;
        title?: string;
        message?: string;
    }) => void;
    appealPerspective?: AppealUiPerspective;
    /** إضبارة الأم — لاكتشاف اكتمال طلبات التحكم بالإضبارة من السجل الزمني */
    parentExecutionId?: string;
    onOutcomeApplied?: () => void;
};

/** مرآة قرار المنفذ في المحضر — نفس صف التخزين الذي تُعرض عليه بطاقة القرارات */
export const ExecutorDecisionFollowupMirror: React.FC<ExecutorDecisionFollowupMirrorProps> = ({
    executionId,
    row,
    requestKind,
    personalCoerciveSubtype,
    className = '',
    compact = false,
    disabled: mirrorDisabled = false,
    onWaiveInitialAppealApplied,
    appealPerspective = 'creditor_agent',
    parentExecutionId,
    onOutcomeApplied,
}) => {
    const exId = String(executionId || '').trim();
    const decisionId = row ? String((row as { id?: string }).id || '').trim() : '';
    const [liveRow, setLiveRow] = useState<Record<string, unknown>>(row as Record<string, unknown>);

    useEffect(() => {
        if (!row) return;
        setLiveRow(row as Record<string, unknown>);
    }, [row, decisionId, (row as { executorOutcome?: string })?.executorOutcome]);

    if (!exId || !decisionId || !row) return null;

    const viewRow = liveRow;

    const rejected = isExecutorRowRejectedAndFinal(viewRow);
    const approved = isExecutorRowEffectivelyApproved(viewRow);
    const pending =
        String((viewRow as { executorOutcome?: string }).executorOutcome ?? 'pending') === 'pending' ||
        String((viewRow as { executorOutcome?: string }).executorOutcome ?? '') === '';
    const withdrawn =
        String((viewRow as { executorOutcome?: string }).executorOutcome || '') === 'withdrawn' ||
        (viewRow as { lawyerWithdrawn?: boolean }).lawyerWithdrawn === true;

    const handleResolved = useCallback(
        (result: {
            ok: boolean;
            outcome?: 'approved' | 'rejected';
            personalCoerciveSubtype?: string;
            storageExecutionId?: string;
            decisionId?: string;
        }) => {
            if (!result.ok || !result.outcome) return;
            setLiveRow((prev) => ({
                ...prev,
                executorOutcome: result.outcome,
                resolvedAt: new Date().toISOString(),
                status: result.outcome === 'rejected' ? 'rejected' : 'accepted',
            }));
            onOutcomeApplied?.();
        },
        [onOutcomeApplied],
    );

    const openDecisions = useCallback(
        (tab: 'current' | 'previous' | 'appeals' = 'previous') => {
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-decisions-modal', {
                        detail: { executionId: exId, tab, decisionId },
                    })
                );
            } catch {
                /* ignore */
            }
        },
        [exId, decisionId]
    );

    const rk = String(requestKind || (viewRow as { requestKind?: string }).requestKind || '').trim();
    const pcSub =
        personalCoerciveSubtype ||
        String((viewRow as { personalCoerciveSubtype?: string }).personalCoerciveSubtype || '').trim();

    const allDecisions = useMemo(
        () => readExecutorDecisionsArray(exId) as Decision[],
        [exId, viewRow, decisionId],
    );

    const followupBlock = useMemo(() => {
        return resolveExecutorRequestFollowupBlockFromRecord(
            viewRow,
            allDecisions,
            appealPerspective
        );
    }, [allDecisions, viewRow, appealPerspective]);

    const waiveInitialAppealButton = (
        <WaiveInitialAppealButton
            executionId={exId}
            decisionId={decisionId}
            allDecisions={allDecisions}
            disabled={mirrorDisabled}
            onApplied={onWaiveInitialAppealApplied}
            appealPerspective={appealPerspective}
        />
    );

    const creditorPartyApproved =
        appealPerspective === 'debtor_agent' &&
        approved &&
        isCreditorInitiatedExecutorRequest(hubWithInferredAppealOrigin(viewRow as Decision));

    const inlineDecisionActionsProps = {
        executionId: exId,
        decisionId,
        decisionRow: viewRow,
        requestKind: rk || undefined,
        personalCoerciveSubtype: pcSub || undefined,
        suppressNavigatorToast: true,
        onResolved: handleResolved,
    };

    const actions = <ExecutionInlineExecutorDecisionActions {...inlineDecisionActionsProps} />;

    if (withdrawn) {
        if (compact) {
            return (
                <button
                    type="button"
                    onClick={() => openDecisions('previous')}
                    className={`w-full rounded-xl border border-slate-500/30 bg-slate-800/40 py-2 text-[10px] font-bold text-slate-200 hover:bg-slate-800/60 ${className}`}
                >
                    عرض في القرارات والطعون
                </button>
            );
        }
        return (
            <div
                className={`rounded-xl border border-slate-500/25 bg-slate-950/30 p-3 text-right ${className}`}
                dir="rtl"
            >
                <p className="text-[11px] font-black text-slate-300">تنازل / سحب الطلب</p>
                <p className="mt-1 text-[10px] text-slate-400">البطاقة في مركز القرارات محدّثة.</p>
                <button
                    type="button"
                    onClick={() => openDecisions('previous')}
                    className="mt-2 w-full rounded-xl border border-slate-500/30 bg-slate-800/40 py-2 text-[10px] font-bold text-slate-200 hover:bg-slate-800/60"
                >
                    عرض في القرارات والطعون
                </button>
            </div>
        );
    }

    if (approved) {
        if (followupBlock) {
            return (
                <div className={className} dir="rtl">
                    <ExecutorRequestFollowupBlockPanel
                        gate={followupBlock}
                        executionId={exId}
                        decisionId={decisionId}
                        appealPerspective={appealPerspective}
                        onOpenAppeals={() => openDecisions('previous')}
                    />
                </div>
            );
        }
        if (rk === 'special_followup') {
            const parentId = String(parentExecutionId || '').trim();
            const dossierSettled = isDossierControlDecisionSettled(viewRow, {
                parentExecutionId: parentId || undefined,
                allDecisions: allDecisions as Record<string, unknown>[],
                appealPerspective,
            });
            if (dossierSettled) {
                if (compact) {
                    return (
                        <p className={`text-[10px] font-bold text-emerald-200/90 ${className}`} dir="rtl">
                            ✓ تم إكمال الإجراء
                        </p>
                    );
                }
                return (
                    <div
                        className={`rounded-xl border border-emerald-500/25 bg-emerald-950/25 p-3 text-right ${className}`}
                        dir="rtl"
                    >
                        <p className="text-[11px] font-black text-emerald-200">✓ تم إكمال الإجراء</p>
                        <p className="mt-1 text-[10px] text-emerald-200/80">
                            تم تطبيق آثار الموافقة على الإضبارة — يمكنك إرسال طلب جديد.
                        </p>
                    </div>
                );
            }
            if (compact) {
                return (
                    <button
                        type="button"
                        onClick={() => openDecisions('previous')}
                        className={`w-full rounded-xl border border-emerald-500/35 bg-emerald-500/10 py-2 text-[10px] font-bold text-emerald-100 hover:bg-emerald-500/15 ${className}`}
                    >
                        متابعة إكمال الإجراء
                    </button>
                );
            }
            return (
                <div
                    className={`rounded-xl border border-emerald-500/25 bg-emerald-950/25 p-3 text-right ${className}`}
                    dir="rtl"
                >
                    <p className="text-[11px] font-black text-emerald-200">✓ تمت موافقة المنفذ</p>
                    <p className="mt-1 text-[10px] text-emerald-200/80">
                        بانتظار تطبيق الآثار على الإضبارة — افتح البطاقة في القرارات للمتابعة.
                    </p>
                    <button
                        type="button"
                        onClick={() => openDecisions('previous')}
                        className="mt-2 w-full rounded-xl border border-emerald-500/35 bg-emerald-500/10 py-2 text-[10px] font-bold text-emerald-100 hover:bg-emerald-500/15"
                    >
                        فتح البطاقة في القرارات والطعون
                    </button>
                </div>
            );
        }
        const effectivelyEnforced = isExecutorDecisionRowEffectivelyEnforced(
            viewRow,
            allDecisions as Record<string, unknown>[],
            appealPerspective
        );
        if (!effectivelyEnforced) {
            return null;
        }
        if (creditorPartyApproved) {
            if (compact) {
                return (
                    <button
                        type="button"
                        onClick={() => openDecisions('previous')}
                        className={`w-full rounded-xl border border-rose-400/35 bg-rose-500/10 py-2 text-[10px] font-bold text-rose-100 hover:bg-rose-500/15 ${className}`}
                    >
                        موافقة ضد موكّلك — فتح القرارات والطعون
                    </button>
                );
            }
            return (
                <div
                    className={`rounded-xl border border-rose-400/25 bg-rose-950/25 p-3 text-right ${className}`}
                    dir="rtl"
                >
                    <p className="text-[11px] font-black text-rose-200">
                        قرار المنفذ لصالح الدائن — ضد موكّلك
                    </p>
                    <p className="mt-1 text-[10px] text-rose-200/80">
                        الطلب غير نافذ لصالح موكّلك — راجع القرارات والطعون للمسار القانوني.
                    </p>
                    <button
                        type="button"
                        onClick={() => openDecisions('previous')}
                        className="mt-2 w-full rounded-xl border border-rose-400/35 bg-rose-500/10 py-2 text-[10px] font-bold text-rose-100 hover:bg-rose-500/15"
                    >
                        فتح البطاقة في القرارات والطعون
                    </button>
                </div>
            );
        }
        if (compact) return null;
        return (
            <div
                className={`rounded-xl border border-emerald-500/25 bg-emerald-950/25 p-3 text-right ${className}`}
                dir="rtl"
            >
                <p className="text-[11px] font-black text-emerald-200">✓ تمت موافقة المنفذ</p>
                <p className="mt-1 text-[10px] text-emerald-200/80">
                    مزامن مع بطاقة القرارات — تابع الإكمال من هنا أو من المركز.
                </p>
                <button
                    type="button"
                    onClick={() => openDecisions('previous')}
                    className="mt-2 w-full rounded-xl border border-emerald-500/35 bg-emerald-500/10 py-2 text-[10px] font-bold text-emerald-100 hover:bg-emerald-500/15"
                >
                    فتح البطاقة في القرارات والطعون
                </button>
            </div>
        );
    }

    if (rejected) {
        if (
            isExecutorHubRowSuperseded(viewRow) ||
            isExecutorRejectedAppealFollowupDismissed(decisionId, allDecisions as Record<string, unknown>[])
        ) {
            return null;
        }
        if (compact) {
            return (
                <div className={className} dir="rtl">
                    <ExecutionInlineExecutorDecisionActions
                        {...inlineDecisionActionsProps}
                        disabled
                        onOpenAppealCenter={() => openDecisions('previous')}
                    />
                    {waiveInitialAppealButton}
                </div>
            );
        }
        return (
            <div
                className={`rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-right ${className}`}
                dir="rtl"
            >
                <p className="text-[11px] font-black text-rose-200">تم رفض الطلب من قبل المنفذ</p>
                <div className="mt-2 space-y-2">
                    <ExecutionInlineExecutorDecisionActions
                        {...inlineDecisionActionsProps}
                        disabled
                        onOpenAppealCenter={() => openDecisions('previous')}
                    />
                    {waiveInitialAppealButton}
                </div>
            </div>
        );
    }

    if (!pending) return null;

    if (compact) {
        return <div className={className}>{actions}</div>;
    }

    return (
        <div
            className={`rounded-xl border border-amber-500/20 bg-[#05060D]/55 p-3 text-right ${className}`}
            dir="rtl"
        >
            <p className="mb-2 text-[10px] font-bold text-amber-200/90">قرار المنفذ — قيد البت</p>
            {actions}
        </div>
    );
};
