import React from 'react';
import {
    isExecutorHubRowSuperseded,
} from '@/app/utils/executorSeizureDecisionQueue';
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

export type ExecutorDecisionFollowupMirrorViewsProps = {
    className: string;
    compact: boolean;
    exId: string;
    decisionId: string;
    viewRow: Record<string, unknown>;
    allDecisions: Decision[];
    appealPerspective: AppealUiPerspective;
    parentExecutionId?: string;
    mirrorDisabled: boolean;
    onWaiveInitialAppealApplied?: (result: {
        ok: boolean;
        mergedRowId?: string;
        title?: string;
        message?: string;
    }) => void;
    withdrawn: boolean;
    approved: boolean;
    rejected: boolean;
    pending: boolean;
    followupBlock: unknown;
    rk: string;
    creditorPartyApproved: boolean;
    inlineDecisionActionsProps: {
        executionId: string;
        decisionId: string;
        decisionRow: Record<string, unknown>;
        requestKind?: string;
        personalCoerciveSubtype?: string;
        suppressNavigatorToast: boolean;
        onResolved: (result: {
            ok: boolean;
            outcome?: 'approved' | 'rejected';
            personalCoerciveSubtype?: string;
            storageExecutionId?: string;
            decisionId?: string;
        }) => void;
    };
    openDecisions: (tab?: 'current' | 'previous' | 'appeals') => void;
};

export function ExecutorDecisionFollowupMirrorViews({
    className,
    compact,
    exId,
    decisionId,
    viewRow,
    allDecisions,
    appealPerspective,
    parentExecutionId,
    mirrorDisabled,
    onWaiveInitialAppealApplied,
    withdrawn,
    approved,
    rejected,
    pending,
    followupBlock,
    rk,
    creditorPartyApproved,
    inlineDecisionActionsProps,
    openDecisions,
}: ExecutorDecisionFollowupMirrorViewsProps) {
    const actions = <ExecutionInlineExecutorDecisionActions {...inlineDecisionActionsProps} />;

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
                        gate={followupBlock as never}
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
                allDecisions: allDecisions as unknown as Record<string, unknown>[],
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
            allDecisions as unknown as Record<string, unknown>[],
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
            isExecutorRejectedAppealFollowupDismissed(decisionId, allDecisions as unknown as Record<string, unknown>[])
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
}
