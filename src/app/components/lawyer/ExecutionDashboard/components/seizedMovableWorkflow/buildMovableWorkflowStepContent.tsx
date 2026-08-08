import React from 'react';
import type { SeizedMovable } from '@/app/types/execution';
import { readExpertCommitteeSize } from '../../utils/expertCommitteeUtils';
import {
    buildMovableWorkflowStepHistory,
    executorSubtypesForMovableWorkflowStep,
    findSeizureDecisionForMovable,
} from '../../utils/movableSeizureWorkflowUtils';
import { normalizeSeizureWorkflowStatus } from '@/app/domain/seizure/seizureWorkflowStatus';
import type { MovableInlineSectionKey } from '../MovableSeizureInlineSections';
import {
    MOVABLE_WORKFLOW_ACTION_SHELL,
    MOVABLE_WORKFLOW_BTN,
    MOVABLE_WORKFLOW_PATH_HINT,
} from './seizedMovableWorkflowConstants';
import type { MovableWorkflowStep2Lane } from './seizedMovableWorkflowTypes';
import {
    movableWorkflowActionClick,
    movableWorkflowApprovedInlineResume,
    movableWorkflowDoneStepHistoryShell,
    movableWorkflowInlineSaveShell,
} from './seizedMovableWorkflowUiHelpers';
import { SeizureWorkflowPendingFallback } from './seizureWorkflowPendingFallback';

export type MovableWorkflowStepContentDeps = {
    activeIdx: number;
    decisions: Array<Record<string, unknown>>;
    normStatus: string;
    m: SeizedMovable;
    movableId: string;
    renderInlineForStep: (stepIndex: number, sectionOverride?: MovableInlineSectionKey) => React.ReactNode;
    hasPendingSubtype: (subtype: string) => boolean;
    submitSubtype: (
        lead: string,
        requestTitle: string,
        subtype: string,
        extraLines?: string[],
        payloadExtra?: Record<string, unknown>,
    ) => string | null;
    hasAnyPendingForStep: (stepIndex: number) => boolean;
    expertApprovedUnsaved: Record<string, unknown> | null | undefined;
    expertCommitteeApprovedUnsaved: Record<string, unknown> | null | undefined;
    auctionApprovedUnsaved: Record<string, unknown> | null | undefined;
    reauctionApprovedUnsaved: Record<string, unknown> | null | undefined;
    step2Lane: MovableWorkflowStep2Lane | null;
    setStep2Lane: React.Dispatch<React.SetStateAction<MovableWorkflowStep2Lane | null>>;
    optimisticObjectionDecisionId: string | null;
    submitObjectionRequest: (objectionKind: 'report' | 'experts') => void;
    renderStepPendingMirror: (stepIndex: number, preferredSubtype?: string) => React.ReactNode;
    dismissedApprovedInlineForStep: number | null;
    setDismissedApprovedInlineForStep: React.Dispatch<React.SetStateAction<number | null>>;
    inlineFocusKey: string | null;
    pendingDecisionId: string | null;
    proceedsDone: boolean;
    openTrustDisburseForProceeds: () => void;
};

export function buildMovableWorkflowStepContent(
    deps: MovableWorkflowStepContentDeps,
    stepIndex: number,
): React.ReactNode {
    const {
        activeIdx,
        decisions,
        normStatus,
        m,
        movableId,
        renderInlineForStep,
        hasPendingSubtype,
        submitSubtype,
        hasAnyPendingForStep,
        expertApprovedUnsaved,
        expertCommitteeApprovedUnsaved,
        auctionApprovedUnsaved,
        reauctionApprovedUnsaved,
        step2Lane,
        setStep2Lane,
        optimisticObjectionDecisionId,
        submitObjectionRequest,
        renderStepPendingMirror,
        dismissedApprovedInlineForStep,
        setDismissedApprovedInlineForStep,
        inlineFocusKey,
        pendingDecisionId,
        proceedsDone,
        openTrustDisburseForProceeds,
    } = deps;

    if (stepIndex > activeIdx) return null;
    if (stepIndex < activeIdx) {
        return movableWorkflowDoneStepHistoryShell(
            buildMovableWorkflowStepHistory(stepIndex, m, decisions, movableId),
        );
    }

    const inline = renderInlineForStep(stepIndex);
    const hasMark = Boolean(String(m.seizureMarkLetterNumber || '').trim());
    const norm = normalizeSeizureWorkflowStatus(normStatus);

    if (stepIndex === 0 && norm === 'seized' && !hasMark) {
        return inline;
    }

    if (stepIndex === 1 && norm === 'seized' && hasMark) {
        if (hasPendingSubtype('movable_expert')) {
            const pending = renderStepPendingMirror(1, 'movable_expert');
            if (pending) return pending;
        }
        const expertInlineReady =
            expertApprovedUnsaved ||
            (inlineFocusKey === 'experts' && Boolean(String(pendingDecisionId || '').trim()));
        if (expertInlineReady) {
            if (dismissedApprovedInlineForStep === 1) {
                return movableWorkflowApprovedInlineResume(
                    'تمت الموافقة على انتداب الخبراء — أكمل التسجيل',
                    () => setDismissedApprovedInlineForStep(null),
                );
            }
            const shell = movableWorkflowInlineSaveShell(inline);
            if (shell) return shell;
        }
        return (
            <div className={MOVABLE_WORKFLOW_ACTION_SHELL}>
                <button
                    type="button"
                    onClick={movableWorkflowActionClick(() =>
                        submitSubtype(
                            'طلب انتداب خبراء لتقدير المال المنقول.',
                            'طلب انتداب خبراء — مال منقول (قيد البت لدى المنفذ)',
                            'movable_expert',
                        ),
                    )}
                    className={`${MOVABLE_WORKFLOW_BTN} border-sky-400/25 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15`}
                >
                    طلب انتداب خبراء للتقدير
                </button>
            </div>
        );
    }

    if (stepIndex === 2 && norm === 'valued') {
        const objectionPending =
            hasPendingSubtype('movable_expert_objection') ||
            Boolean(String(optimisticObjectionDecisionId || '').trim());
        const auctionPending = hasPendingSubtype('movable_auction_date');

        if (auctionPending) {
            const pending = renderStepPendingMirror(2, 'movable_auction_date');
            if (pending) return pending;
        }
        if (auctionApprovedUnsaved) {
            if (dismissedApprovedInlineForStep === 2) {
                return movableWorkflowApprovedInlineResume(
                    'تمت الموافقة على موعد المزايدة — أكمل التسجيل',
                    () => setDismissedApprovedInlineForStep(null),
                );
            }
            return movableWorkflowInlineSaveShell(inline);
        }
        if (objectionPending) {
            const pending = renderStepPendingMirror(2, 'movable_expert_objection');
            if (pending) return pending;
            return (
                <div className={MOVABLE_WORKFLOW_ACTION_SHELL}>
                    <SeizureWorkflowPendingFallback title="طلب الاعتراض على التقدير — قيد البت" />
                </div>
            );
        }

        const laneBtnCls = (lane: MovableWorkflowStep2Lane, tone: string) =>
            `${MOVABLE_WORKFLOW_BTN} ${tone} ${
                step2Lane === lane
                    ? 'ring-2 ring-[#E6C673]/70 ring-offset-1 ring-offset-[#05060D]'
                    : ''
            }`;

        if (step2Lane === 'auction') {
            return (
                <div key="lane-auction" className={MOVABLE_WORKFLOW_ACTION_SHELL}>
                    <div className="space-y-2 rounded-2xl border border-[#E6C673]/20 bg-amber-950/15 p-3">
                        <p className={`${MOVABLE_WORKFLOW_PATH_HINT} text-[#E6C673]/90`}>مسار المزايدة</p>
                        <button
                            type="button"
                            onClick={movableWorkflowActionClick(() =>
                                submitSubtype(
                                    'طلب تحديد موعد مزايدة علنية للمال المنقول.',
                                    'طلب تحديد موعد مزايدة — مال منقول (قيد البت لدى المنفذ)',
                                    'movable_auction_date',
                                ),
                            )}
                            className={`${MOVABLE_WORKFLOW_BTN} border-[#E6C673]/25 bg-[#E6C673]/10 text-[#E6C673] hover:bg-[#E6C673]/15`}
                        >
                            طلب تحديد موعد مزايدة
                        </button>
                    </div>
                </div>
            );
        }

        if (step2Lane === 'objection') {
            return (
                <div key="lane-objection" className={MOVABLE_WORKFLOW_ACTION_SHELL}>
                    <div className="space-y-2 rounded-2xl border border-amber-500/20 bg-amber-950/10 p-3">
                        <p className={`${MOVABLE_WORKFLOW_PATH_HINT} text-amber-300/90`}>
                            مسار الاعتراض على التقدير
                        </p>
                        <p className="text-[9px] text-slate-400 text-right leading-relaxed">
                            يُرسل الطلب فوراً — يُبَتّ من قسم «القرارات والطعون».
                        </p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={movableWorkflowActionClick(() => submitObjectionRequest('report'))}
                                className={`${MOVABLE_WORKFLOW_BTN} border-rose-400/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15`}
                            >
                                اعتراض على التقرير
                            </button>
                            <button
                                type="button"
                                onClick={movableWorkflowActionClick(() => submitObjectionRequest('experts'))}
                                className={`${MOVABLE_WORKFLOW_BTN} border-amber-400/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15`}
                            >
                                اعتراض على الخبراء
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div key={step2Lane ?? 'lane-pick'} className={MOVABLE_WORKFLOW_ACTION_SHELL}>
                <p className={`${MOVABLE_WORKFLOW_PATH_HINT} text-slate-400`}>اختر مسار الإجراء</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                        type="button"
                        data-testid="movable-workflow-lane-auction"
                        onClick={movableWorkflowActionClick(() => setStep2Lane('auction'))}
                        className={laneBtnCls(
                            'auction',
                            'border-[#E6C673]/25 bg-[#E6C673]/10 text-[#E6C673] hover:bg-[#E6C673]/15',
                        )}
                    >
                        مسار المزايدة
                    </button>
                    <button
                        type="button"
                        data-testid="movable-workflow-lane-objection"
                        onClick={movableWorkflowActionClick(() => setStep2Lane('objection'))}
                        className={laneBtnCls(
                            'objection',
                            'border-amber-400/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15',
                        )}
                    >
                        مسار الاعتراض على التقدير
                    </button>
                </div>
            </div>
        );
    }

    if (stepIndex === 3 && norm === 'estimation_objected') {
        if (hasPendingSubtype('movable_expert_committee')) {
            return renderStepPendingMirror(3, 'movable_expert_committee');
        }
        if (expertCommitteeApprovedUnsaved) {
            if (dismissedApprovedInlineForStep === 3) {
                return movableWorkflowApprovedInlineResume(
                    'تمت الموافقة على لجنة الخبراء — أكمل التسجيل',
                    () => setDismissedApprovedInlineForStep(null),
                );
            }
            return movableWorkflowInlineSaveShell(inline);
        }
        return (
            <div className={MOVABLE_WORKFLOW_ACTION_SHELL}>
                <button
                    type="button"
                    onClick={movableWorkflowActionClick(() => {
                        const required = readExpertCommitteeSize(m);
                        submitSubtype(
                            'طلب انتداب لجنة خبراء جديدة لتقدير المال المنقول بعد الاعتراض.',
                            'طلب انتداب لجنة خبراء جديدة — مال منقول (قيد البت لدى المنفذ)',
                            'movable_expert_committee',
                            [`عدد الخبراء المطلوب: ${required}`],
                        );
                    })}
                    className={`${MOVABLE_WORKFLOW_BTN} border-amber-400/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15`}
                >
                    طلب انتداب لجنة خبراء جديدة
                </button>
            </div>
        );
    }

    if (stepIndex === 4 && norm === 'published') {
        const needsPub =
            !String(m.newspaperName || '').trim() || !String(m.publicationDateYmd || '').trim();
        if (!needsPub) return inline;
        return inline;
    }

    if (stepIndex === 5 && norm === 'published') {
        const needsPub =
            !String(m.newspaperName || '').trim() || !String(m.publicationDateYmd || '').trim();
        if (needsPub) return null;
        return inline;
    }

    if (stepIndex === 6 && norm === 'no_bidders') {
        if (hasPendingSubtype('movable_auction_date')) {
            return renderStepPendingMirror(6, 'movable_auction_date');
        }
        if (auctionApprovedUnsaved) {
            if (dismissedApprovedInlineForStep === 6) {
                return movableWorkflowApprovedInlineResume(
                    'تمت الموافقة على موعد المزايدة الجديد — أكمل التسجيل',
                    () => setDismissedApprovedInlineForStep(null),
                );
            }
            return movableWorkflowInlineSaveShell(inline);
        }
        return (
            <div className={MOVABLE_WORKFLOW_ACTION_SHELL}>
                <button
                    type="button"
                    onClick={movableWorkflowActionClick(() =>
                        submitSubtype(
                            'طلب تحديد موعد مزايدة جديد (كسر القرار) للمال المنقول.',
                            'طلب تحديد موعد مزايدة جديد — مال منقول (قيد البت لدى المنفذ)',
                            'movable_auction_date',
                        ),
                    )}
                    className={`${MOVABLE_WORKFLOW_BTN} border-[#E6C673]/25 bg-[#E6C673]/10 text-[#E6C673] hover:bg-[#E6C673]/15`}
                >
                    طلب تحديد موعد مزايدة جديد (كسر القرار)
                </button>
            </div>
        );
    }

    if (stepIndex === 7 && norm === 'initial_award') {
        if (hasAnyPendingForStep(7)) {
            return renderStepPendingMirror(7);
        }
        if (reauctionApprovedUnsaved) {
            if (dismissedApprovedInlineForStep === 7) {
                return movableWorkflowApprovedInlineResume(
                    'تمت الموافقة على إعادة المزايدة — أكمل التسجيل',
                    () => setDismissedApprovedInlineForStep(null),
                );
            }
            return movableWorkflowInlineSaveShell(renderInlineForStep(7, 'reauction_default'));
        }
        return (
            <div className={MOVABLE_WORKFLOW_ACTION_SHELL}>
                <p className={`${MOVABLE_WORKFLOW_PATH_HINT} text-slate-400`}>اختر أحد الإجراءات التالية</p>
                <button
                    type="button"
                    onClick={movableWorkflowActionClick(() =>
                        submitSubtype(
                            'طلب إحالة قطعية للمال المنقول.',
                            'طلب إحالة قطعية — مال منقول (قيد البت لدى المنفذ)',
                            'movable_final_award',
                            [
                                `المشتري (رسو مزاد): ${String(m.initialAwardBuyerName || '').trim()}`,
                                m.initialAwardAmountIqd != null &&
                                Number.isFinite(Number(m.initialAwardAmountIqd))
                                    ? `مبلغ رسو المزاد: ${Number(m.initialAwardAmountIqd).toLocaleString('ar-IQ')} د.ع`
                                    : '',
                            ].filter(Boolean),
                        ),
                    )}
                    className={`${MOVABLE_WORKFLOW_BTN} border-sky-400/25 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15`}
                >
                    طلب إحالة قطعية
                </button>
                <button
                    type="button"
                    onClick={movableWorkflowActionClick(() =>
                        submitSubtype(
                            'طلب إعادة المزايدة للنكول (تهرب المشتري من الدفع) للمال المنقول.',
                            'طلب إعادة المزايدة للنكول — مال منقول (قيد البت لدى المنفذ)',
                            'movable_reauction_default',
                        ),
                    )}
                    className={`${MOVABLE_WORKFLOW_BTN} border-rose-400/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15`}
                >
                    طلب إعادة المزايدة للنكول
                </button>
            </div>
        );
    }

    if (stepIndex === 7 && norm === 'sold') {
        if (proceedsDone) {
            return (
                <p className="text-[10px] font-bold text-sky-200/90 text-right">
                    تمت الإحالة القطعية وصرف الحصيلة في السجل المالي.
                </p>
            );
        }
        return (
            <div className={MOVABLE_WORKFLOW_ACTION_SHELL}>
                <p className="text-[10px] font-bold text-sky-200/90 text-right leading-relaxed">
                    تمت الإحالة القطعية — يمكنك نقل حصيلة البيع إلى السجل المالي (الأمانات).
                </p>
                <button
                    type="button"
                    onClick={movableWorkflowActionClick(openTrustDisburseForProceeds)}
                    className={`${MOVABLE_WORKFLOW_BTN} border-sky-400/25 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15`}
                >
                    نقل حصيلة البيع — السجل المالي
                </button>
            </div>
        );
    }

    return inline;
}

export function resolveMovableWorkflowPendingRowForStep(
    decisions: Array<Record<string, unknown>>,
    movableId: string,
    stepIndex: number,
    optimisticObjectionDecisionId: string | null,
    preferredSubtype?: string,
    optimisticPendingBySubtype?: Record<string, string>,
): Record<string, unknown> | null {
    if (preferredSubtype) {
        const row = findSeizureDecisionForMovable(decisions, preferredSubtype, movableId, {
            pendingOnly: true,
        });
        if (row) return row;
        const optimisticId = String(optimisticPendingBySubtype?.[preferredSubtype] || '').trim();
        if (optimisticId) {
            const titleBySubtype: Record<string, string> = {
                movable_expert: 'طلب انتداب خبراء — مال منقول (قيد البت لدى المنفذ)',
                movable_expert_objection: 'طلب الاعتراض على التقدير — مال منقول (قيد البت لدى المنفذ)',
                movable_auction_date: 'طلب تحديد موعد مزايدة — مال منقول (قيد البت لدى المنفذ)',
            };
            return {
                id: optimisticId,
                title: titleBySubtype[preferredSubtype] || 'طلب حجز — مال منقول (قيد البت لدى المنفذ)',
                executorOutcome: 'pending',
                requestKind: 'seizure',
                seizureSubtype: preferredSubtype,
            } as Record<string, unknown>;
        }
        if (
            preferredSubtype === 'movable_expert_objection' &&
            String(optimisticObjectionDecisionId || '').trim()
        ) {
            const oid = String(optimisticObjectionDecisionId || '').trim();
            return (
                decisions.find((r) => String(r?.id || '').trim() === oid) ||
                ({
                    id: oid,
                    title: 'طلب الاعتراض على التقدير — مال منقول (قيد البت لدى المنفذ)',
                    executorOutcome: 'pending',
                    requestKind: 'seizure',
                    seizureSubtype: preferredSubtype,
                } as Record<string, unknown>)
            );
        }
        return null;
    }
    for (const st of executorSubtypesForMovableWorkflowStep(stepIndex)) {
        const row = findSeizureDecisionForMovable(decisions, st, movableId, {
            pendingOnly: true,
        });
        if (row) return row;
    }
    return null;
}
