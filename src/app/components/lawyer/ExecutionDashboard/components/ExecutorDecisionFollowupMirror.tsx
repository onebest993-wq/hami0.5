import React, { useCallback, useMemo } from 'react';
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
}) => {
    const exId = String(executionId || '').trim();
    const decisionId = row ? String((row as { id?: string }).id || '').trim() : '';
    if (!exId || !decisionId || !row) return null;

    const rejected = isExecutorRowRejectedAndFinal(row);
    const approved = isExecutorRowEffectivelyApproved(row);
    const pending =
        String((row as { executorOutcome?: string }).executorOutcome ?? 'pending') === 'pending' ||
        String((row as { executorOutcome?: string }).executorOutcome ?? '') === '';
    const withdrawn =
        String((row as { executorOutcome?: string }).executorOutcome || '') === 'withdrawn' ||
        (row as { lawyerWithdrawn?: boolean }).lawyerWithdrawn === true;

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

    const rk = String(requestKind || (row as { requestKind?: string }).requestKind || '').trim();
    const pcSub =
        personalCoerciveSubtype ||
        String((row as { personalCoerciveSubtype?: string }).personalCoerciveSubtype || '').trim();

    const allDecisions = useMemo(
        () => readExecutorDecisionsArray(exId) as Decision[],
        [exId, row]
    );

    const followupBlock = useMemo(() => {
        return resolveExecutorRequestFollowupBlockFromRecord(
            row,
            allDecisions,
            appealPerspective
        );
    }, [allDecisions, row, appealPerspective]);

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
        isCreditorInitiatedExecutorRequest(hubWithInferredAppealOrigin(row as Decision));

    const actions = (
        <ExecutionInlineExecutorDecisionActions
            executionId={exId}
            decisionId={decisionId}
            requestKind={rk || undefined}
            personalCoerciveSubtype={pcSub || undefined}
        />
    );

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
            return null;
        }
        const effectivelyEnforced = isExecutorDecisionRowEffectivelyEnforced(
            row,
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
            isExecutorHubRowSuperseded(row) ||
            isExecutorRejectedAppealFollowupDismissed(decisionId, allDecisions as Record<string, unknown>[])
        ) {
            return null;
        }
        if (compact) {
            return (
                <div className={className} dir="rtl">
                    <ExecutionInlineExecutorDecisionActions
                        executionId={exId}
                        decisionId={decisionId}
                        requestKind={rk || undefined}
                        personalCoerciveSubtype={pcSub || undefined}
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
                        executionId={exId}
                        decisionId={decisionId}
                        requestKind={rk || undefined}
                        personalCoerciveSubtype={pcSub || undefined}
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
