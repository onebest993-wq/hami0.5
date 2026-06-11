import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { SeizedMovable } from '@/app/types/execution';
import { appendPendingExecutorSeizureDecision } from '@/app/utils/executorSeizureDecisionQueue';
import {
    ExecutionInlineAccordion,
    type ExecutionInlineStep,
} from './ExecutionInlineAccordion';
import {
    executorSubtypesForMovableWorkflowStep,
    findApprovedUnsavedMovableDecision,
    findSeizureDecisionForMovable,
    filterRelevantPendingMovableDecisions,
    movableSeizureRequestBody,
    movableWorkflowActiveStepIndex,
    normalizeMovableSeizureStatus,
    withdrawPendingMovableDecisionsForStep,
    buildMovableWorkflowStepHistory,
    findConflictingPendingMovableSubtype,
    movableConflictingSubtypeLabelAr,
} from '../utils/movableSeizureWorkflowUtils';
import { stepStatusForIndex } from '../utils/propertySeizureWorkflowUtils';
import { readExpertCommitteeSize } from '../utils/expertCommitteeUtils';
import {
    MovableSeizureInlineSections,
    type MovableExpertDecisionSubtype,
    type MovableInlineSectionKey,
} from './MovableSeizureInlineSections';
import type { MovableInlineSaveContext } from '../utils/movableSeizureInlinePersistence';
import { ExecutorDecisionFollowupMirror } from './ExecutorDecisionFollowupMirror';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import {
    isSeizureWorkflowNestedView,
    seizureWorkflowStepBackLabel,
    shouldShowSeizureWorkflowStepBack,
    type SeizureWorkflowStepBackContext,
} from '../utils/seizureWorkflowStepBackUtils';
import { applyMovableWorkflowRevert } from '../utils/seizureWorkflowRevertUtils';

const STEP_TITLES = [
    'تأييد وضع الإشارة',
    'انتداب الخبراء والتقدير',
    'موعد المزايدة أو اعتراض التقدير',
    'لجنة خبراء جديدة (بعد الاعتراض)',
    'النشر والإعلان',
    'نتيجة جلسة المزايدة',
    'لا راغب بالشراء',
    'إحالة قطعية وإعادة مزايدة',
] as const;

const BTN =
    'relative z-[2] w-full rounded-2xl border px-3 py-3 text-[11px] font-black transition-colors disabled:opacity-40 pointer-events-auto';

const ACTION_SHELL = 'relative z-[2] space-y-2 pointer-events-auto';

const PATH_HINT = 'text-[10px] font-bold text-slate-500 text-right';

function actionClick(handler: () => void) {
    return (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handler();
    };
}

function inlineSaveShell(inline: React.ReactNode): React.ReactNode {
    if (!inline) return null;
    return <div className={ACTION_SHELL}>{inline}</div>;
}

function doneStepHistoryShell(lines: Array<{ label: string; value: string }>): React.ReactNode {
    return (
        <div className={ACTION_SHELL}>
            <div className="space-y-2 rounded-xl border border-emerald-500/15 bg-emerald-950/10 p-3">
                <p className="text-[9px] font-bold text-emerald-200/90 text-right">سجل الخطوة</p>
                {lines.length === 0 ? (
                    <p className="text-[10px] text-slate-500 text-right">لا توجد تفاصيل مسجّلة.</p>
                ) : (
                    <div className="space-y-1.5">
                        {lines.map((row) => (
                            <div key={`${row.label}-${row.value}`} className="text-right leading-relaxed">
                                <span className="text-[9px] font-bold text-slate-400">{row.label}: </span>
                                <span className="text-[10px] text-slate-100 whitespace-pre-wrap">{row.value}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function expertSubtypeForWorkflowStep(stepIndex: number): MovableExpertDecisionSubtype | undefined {
    if (stepIndex === 1) return 'movable_expert';
    if (stepIndex === 3) return 'movable_expert_committee';
    return undefined;
}

function inlineSectionForStep(stepIndex: number): MovableInlineSectionKey | null {
    switch (stepIndex) {
        case 0:
            return 'mark';
        case 1:
        case 3:
            return 'experts';
        case 2:
        case 6:
            return 'auction';
        case 4:
            return 'publication';
        case 5:
            return 'auction_result';
        case 7:
            return 'reauction_default';
        default:
            return null;
    }
}

export type SeizedMovableWorkflowPanelProps = {
    movable: SeizedMovable;
    workflowStatus: string;
    decisionsStorageExecutionId: string;
    executionId?: string;
    executionDataId?: string;
    decisions: Array<Record<string, unknown>>;
    movables: SeizedMovable[];
    movableInlineSaveCtx: MovableInlineSaveContext;
    showToast: (message: string, type?: 'success' | 'warning' | 'info') => void;
    onOpenAppeals?: (decisionId: string) => void;
    decisionsReloadEpoch?: number;
    appealPerspective?: AppealUiPerspective;
};

export const SeizedMovableWorkflowPanel: React.FC<SeizedMovableWorkflowPanelProps> = ({
    movable: m,
    workflowStatus: status,
    decisionsStorageExecutionId,
    executionId,
    executionDataId,
    decisions,
    movables,
    movableInlineSaveCtx,
    showToast,
    onOpenAppeals,
    decisionsReloadEpoch = 0,
    appealPerspective = 'creditor_agent',
}) => {
    const movableId = String(m.id || '').trim();
    const dossierId = String(
        decisionsStorageExecutionId || executionDataId || executionId || ''
    ).trim();
    const normStatus = normalizeMovableSeizureStatus(status);

    const relevantPendingRows = React.useMemo(
        () => filterRelevantPendingMovableDecisions(decisions, m, normStatus),
        [decisions, m, normStatus, decisionsReloadEpoch]
    );

    const activeIdx = movableWorkflowActiveStepIndex(normStatus, m);

    const [workflowExpanded, setWorkflowExpanded] = React.useState(
        () => relevantPendingRows.length > 0 || activeIdx >= 0
    );

    React.useEffect(() => {
        if (relevantPendingRows.length > 0) setWorkflowExpanded(true);
    }, [relevantPendingRows.length]);

    const [inlineFocusKey, setInlineFocusKey] = React.useState<string | null>(null);
    const [pendingDecisionId, setPendingDecisionId] = React.useState<string | null>(null);
    const [inlineRemountKey, setInlineRemountKey] = React.useState(0);

    React.useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{
                movableId?: string;
                step?: string;
                decisionId?: string;
            }>;
            if (String(ce.detail?.movableId || '').trim() !== movableId) return;
            setWorkflowExpanded(true);
            setInlineFocusKey(String(ce.detail?.step || 'experts').trim());
            setPendingDecisionId(String(ce.detail?.decisionId || '').trim() || null);
        };
        window.addEventListener('hami-movable-inline-focus', handler as EventListener);
        return () => window.removeEventListener('hami-movable-inline-focus', handler as EventListener);
    }, [movableId]);

    const submitSubtype = React.useCallback(
        (
            lead: string,
            requestTitle: string,
            subtype: string,
            extraLines?: string[],
            payloadExtra?: Record<string, unknown>
        ): string | null => {
            if (!dossierId || dossierId === 'undefined' || dossierId === 'default') {
                showToast('تعذر ربط الطلب بملف التنفيذ. أعد فتح المحضر.', 'warning');
                return null;
            }
            const conflict = findConflictingPendingMovableSubtype(decisions, movableId, subtype);
            if (conflict) {
                showToast(
                    `لا يمكن إرسال هذا الطلب: يوجد «${movableConflictingSubtypeLabelAr(conflict)}» قيد البت لدى المنفذ. اسحب الطلب السابق أولاً.`,
                    'warning'
                );
                return null;
            }
            const body = [
                movableSeizureRequestBody(m, lead),
                ...(extraLines || []).filter(Boolean),
            ].join('\n');
            const payloadJson = JSON.stringify({ seizedMovableId: movableId, ...(payloadExtra || {}) });
            const did = appendPendingExecutorSeizureDecision({
                executionId: dossierId,
                requestTitle,
                requestBody: body,
                seizureSubtype: subtype as any,
                seizurePayloadJson: payloadJson,
            });
            if (!did) {
                showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning');
                return null;
            }
            showToast('تم إرسال الطلب — قرار المنفذ يظهر أدناه.', 'success');
            return did;
        },
        [dossierId, m, movableId, decisions, showToast]
    );

    const hasPendingSubtype = React.useCallback(
        (subtype: string) =>
            Boolean(
                findSeizureDecisionForMovable(decisions, subtype, movableId, {
                    pendingOnly: true,
                })
            ),
        [decisions, movableId, decisionsReloadEpoch]
    );

    const proceedsDone = Boolean(String(m.proceedsDisburseCompletedAtIso || '').trim());

    const openTrustDisburseForProceeds = React.useCallback(() => {
        if (!dossierId || dossierId === 'undefined' || dossierId === 'default') {
            showToast('تعذر ربط الطلب بملف التنفيذ. أعد فتح المحضر.', 'warning');
            return;
        }
        try {
            window.dispatchEvent(
                new CustomEvent('hami-open-financial-hub-ledger', {
                    detail: {
                        executionId: dossierId,
                        mode: 'disburse',
                        seizedMovableId: movableId,
                    },
                })
            );
        } catch {
            /* ignore */
        }
    }, [dossierId, movableId, showToast]);

    const renderInlineForStep = React.useCallback(
        (stepIndex: number, sectionOverride?: MovableInlineSectionKey) => {
            const sectionKey = sectionOverride ?? inlineSectionForStep(stepIndex);
            if (!sectionKey) return null;
            return (
                <MovableSeizureInlineSections
                    key={`${stepIndex}-${inlineRemountKey}`}
                    movable={m}
                    movables={movables}
                    decisions={decisions}
                    saveCtx={movableInlineSaveCtx}
                    focusKey={inlineFocusKey}
                    pendingDecisionId={pendingDecisionId}
                    section={sectionKey}
                    embedded
                    expertDecisionSubtype={expertSubtypeForWorkflowStep(stepIndex)}
                />
            );
        },
        [m, movables, decisions, movableInlineSaveCtx, inlineFocusKey, pendingDecisionId, inlineRemountKey, decisionsReloadEpoch]
    );

    const expertApprovedUnsaved = React.useMemo(
        () => findApprovedUnsavedMovableDecision(decisions, 'movable_expert', movableId),
        [decisions, movableId, decisionsReloadEpoch]
    );

    const expertCommitteeApprovedUnsaved = React.useMemo(
        () => findApprovedUnsavedMovableDecision(decisions, 'movable_expert_committee', movableId),
        [decisions, movableId, decisionsReloadEpoch]
    );

    const auctionApprovedUnsaved = React.useMemo(
        () => findApprovedUnsavedMovableDecision(decisions, 'movable_auction_date', movableId),
        [decisions, movableId, decisionsReloadEpoch]
    );

    const reauctionApprovedUnsaved = React.useMemo(
        () => findApprovedUnsavedMovableDecision(decisions, 'movable_reauction_default', movableId),
        [decisions, movableId, decisionsReloadEpoch]
    );

    type Step2Lane = 'auction' | 'objection';
    const [step2Lane, setStep2Lane] = React.useState<Step2Lane | null>(null);
    const [optimisticObjectionDecisionId, setOptimisticObjectionDecisionId] = React.useState<
        string | null
    >(null);
    const [dismissedApprovedInlineForStep, setDismissedApprovedInlineForStep] = React.useState<
        number | null
    >(null);
    const [stepNavRequest, setStepNavRequest] = React.useState<{
        targetStepId: string;
        collapseStepId?: string;
        seq: number;
    } | null>(null);

    React.useEffect(() => {
        const pending = findSeizureDecisionForMovable(
            decisions,
            'movable_expert_objection',
            movableId,
            { pendingOnly: true }
        );
        if (pending) {
            setStep2Lane('objection');
            setOptimisticObjectionDecisionId(null);
        }
    }, [decisions, movableId, decisionsReloadEpoch]);

    React.useEffect(() => {
        if (normStatus !== 'valued') {
            setStep2Lane(null);
            setOptimisticObjectionDecisionId(null);
        }
    }, [normStatus]);

    React.useEffect(() => {
        setDismissedApprovedInlineForStep(null);
    }, [activeIdx]);

    const submitObjectionRequest = React.useCallback(
        (objectionKind: 'report' | 'experts') => {
            const lead =
                objectionKind === 'experts'
                    ? 'طلب الاعتراض على الخبراء (استبدالهم دون زيادة العدد).'
                    : 'طلب الاعتراض على تقرير الخبراء (تقدير المال المنقول).';
            const title =
                objectionKind === 'experts'
                    ? 'طلب الاعتراض على الخبراء — مال منقول (قيد البت لدى المنفذ)'
                    : 'طلب الاعتراض على تقرير الخبراء — مال منقول (قيد البت لدى المنفذ)';
            setStep2Lane('objection');
            const did = submitSubtype(
                lead,
                title,
                'movable_expert_objection',
                String(m.expertReportDateYmd || '').trim()
                    ? [`تاريخ التقرير: ${String(m.expertReportDateYmd || '').trim()}`]
                    : [],
                { objectionKind }
            );
            if (did) {
                setOptimisticObjectionDecisionId(did);
                setWorkflowExpanded(true);
            }
        },
        [submitSubtype, m]
    );

    const hasAnyPendingForStep = React.useCallback(
        (stepIndex: number) =>
            executorSubtypesForMovableWorkflowStep(stepIndex).some((subtype) =>
                hasPendingSubtype(subtype)
            ),
        [hasPendingSubtype]
    );

    const handleWithdrawPendingRequest = React.useCallback(() => {
        const withdrawn = withdrawPendingMovableDecisionsForStep(
            dossierId,
            decisions,
            movableId,
            activeIdx
        );
        if (withdrawn > 0) {
            setStep2Lane(null);
            setOptimisticObjectionDecisionId(null);
            showToast('تم سحب الطلب المعلّق لدى المنفذ.', 'success');
            return;
        }
        showToast('لا يوجد طلب معلّق لسحبه.', 'info');
    }, [dossierId, decisions, movableId, activeIdx, showToast]);

    const hasWithdrawablePending =
        relevantPendingRows.length > 0 ||
        Boolean(String(optimisticObjectionDecisionId || '').trim());

    const stepBackContext = React.useMemo((): SeizureWorkflowStepBackContext => {
        return {
            activeIdx,
            inlineFocusKey,
            step2Lane,
            hasPendingOnActiveStep: hasAnyPendingForStep(activeIdx),
            hasOptimisticPending: Boolean(String(optimisticObjectionDecisionId || '').trim()),
            dismissedApprovedInlineForStep,
            expertApprovedUnsaved: Boolean(expertApprovedUnsaved),
            expertCommitteeApprovedUnsaved: Boolean(expertCommitteeApprovedUnsaved),
            auctionApprovedUnsaved: Boolean(auctionApprovedUnsaved),
            reauctionApprovedUnsaved: Boolean(reauctionApprovedUnsaved),
        };
    }, [
        activeIdx,
        inlineFocusKey,
        step2Lane,
        hasAnyPendingForStep,
        optimisticObjectionDecisionId,
        dismissedApprovedInlineForStep,
        expertApprovedUnsaved,
        expertCommitteeApprovedUnsaved,
        auctionApprovedUnsaved,
        reauctionApprovedUnsaved,
    ]);

    const handleActiveStepBack = React.useCallback(() => {
        if (stepBackContext.hasPendingOnActiveStep || stepBackContext.hasOptimisticPending) {
            handleWithdrawPendingRequest();
            return;
        }
        if (stepBackContext.activeIdx === 2 && stepBackContext.step2Lane) {
            setStep2Lane(null);
            return;
        }
        if (String(inlineFocusKey || '').trim()) {
            setInlineFocusKey(null);
            setPendingDecisionId(null);
            return;
        }
        if (isSeizureWorkflowNestedView(stepBackContext)) {
            setDismissedApprovedInlineForStep(activeIdx);
            return;
        }
        if (activeIdx > 0) {
            const result = applyMovableWorkflowRevert(movables, movableId);
            if (!result) {
                showToast('تعذر التراجع عن هذه الخطوة.', 'warning');
                return;
            }
            movableInlineSaveCtx.persistMovables(result.next);
            setStep2Lane(null);
            setOptimisticObjectionDecisionId(null);
            setDismissedApprovedInlineForStep(null);
            setInlineFocusKey(null);
            setPendingDecisionId(null);
            setInlineRemountKey((k) => k + 1);
            setStepNavRequest({
                targetStepId: `movable_step_${result.newActiveIdx}`,
                seq: Date.now(),
            });
        }
    }, [
        stepBackContext,
        handleWithdrawPendingRequest,
        inlineFocusKey,
        activeIdx,
        movables,
        movableId,
        movableInlineSaveCtx,
        showToast,
    ]);

    const stepBackLabel = seizureWorkflowStepBackLabel(stepBackContext);
    const showStepBack = shouldShowSeizureWorkflowStepBack(stepBackContext);

    const resolvePendingRowForStep = React.useCallback(
        (stepIndex: number, preferredSubtype?: string): Record<string, unknown> | null => {
            if (preferredSubtype) {
                const row = findSeizureDecisionForMovable(decisions, preferredSubtype, movableId, {
                    pendingOnly: true,
                });
                if (row) return row;
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
        },
        [decisions, movableId, optimisticObjectionDecisionId, decisionsReloadEpoch]
    );

    const renderStepPendingMirror = React.useCallback(
        (stepIndex: number, preferredSubtype?: string): React.ReactNode => {
            const row = resolvePendingRowForStep(stepIndex, preferredSubtype);
            if (!row) return null;
            const mirror = (
                <div className={ACTION_SHELL}>
                    <ExecutorDecisionFollowupMirror
                        executionId={dossierId}
                        row={row}
                        requestKind="seizure"
                        compact
                        appealPerspective={appealPerspective}
                    />
                </div>
            );
            return mirror;
        },
        [resolvePendingRowForStep, dossierId]
    );

    const renderApprovedInlineResume = React.useCallback(
        (message: string, onResume: () => void): React.ReactNode => (
            <div className={ACTION_SHELL}>
                <p className="text-[10px] font-bold text-emerald-200/90 text-right leading-relaxed">
                    {message}
                </p>
                <button
                    type="button"
                    onClick={actionClick(onResume)}
                    className={`${BTN} border-emerald-400/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15`}
                >
                    متابعة التسجيل
                </button>
            </div>
        ),
        []
    );

    const contentForStepIndex = React.useCallback(
        (stepIndex: number): React.ReactNode => {
            if (stepIndex > activeIdx) return null;
            if (stepIndex < activeIdx) {
                return doneStepHistoryShell(
                    buildMovableWorkflowStepHistory(stepIndex, m, decisions, movableId)
                );
            }

            const inline = renderInlineForStep(stepIndex);
            const hasMark = Boolean(String(m.seizureMarkLetterNumber || '').trim());

            if (stepIndex === 0 && normStatus === 'seized' && !hasMark) {
                return inline;
            }

            if (stepIndex === 1 && normStatus === 'seized' && hasMark) {
                if (hasPendingSubtype('movable_expert')) {
                    return renderStepPendingMirror(1, 'movable_expert');
                }
                if (expertApprovedUnsaved) {
                    if (dismissedApprovedInlineForStep === 1) {
                        return renderApprovedInlineResume(
                            'تمت الموافقة على انتداب الخبراء — أكمل التسجيل',
                            () => setDismissedApprovedInlineForStep(null)
                        );
                    }
                    return inlineSaveShell(inline);
                }
                return (
                    <div className={ACTION_SHELL}>
                        <button
                            type="button"
                            onClick={actionClick(() =>
                                submitSubtype(
                                    'طلب انتداب خبراء لتقدير المال المنقول.',
                                    'طلب انتداب خبراء — مال منقول (قيد البت لدى المنفذ)',
                                    'movable_expert'
                                )
                            )}
                            className={`${BTN} border-emerald-400/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15`}
                        >
                            طلب انتداب خبراء للتقدير
                        </button>
                    </div>
                );
            }

            if (stepIndex === 2 && normStatus === 'valued') {
                const objectionPending =
                    hasPendingSubtype('movable_expert_objection') ||
                    Boolean(String(optimisticObjectionDecisionId || '').trim());
                const auctionPending = hasPendingSubtype('movable_auction_date');

                if (auctionPending) {
                    return renderStepPendingMirror(2, 'movable_auction_date');
                }
                if (auctionApprovedUnsaved) {
                    if (dismissedApprovedInlineForStep === 2) {
                        return renderApprovedInlineResume(
                            'تمت الموافقة على موعد المزايدة — أكمل التسجيل',
                            () => setDismissedApprovedInlineForStep(null)
                        );
                    }
                    return inlineSaveShell(inline);
                }
                if (objectionPending) {
                    return renderStepPendingMirror(2, 'movable_expert_objection');
                }

                const laneBtnCls = (lane: Step2Lane, tone: string) =>
                    `${BTN} ${tone} ${
                        step2Lane === lane
                            ? 'ring-2 ring-[#E6C673]/70 ring-offset-1 ring-offset-[#05060D]'
                            : ''
                    }`;

                if (step2Lane === 'auction') {
                    return (
                        <div className={ACTION_SHELL}>
                            <div className="space-y-2 rounded-2xl border border-sky-500/20 bg-sky-950/15 p-3">
                                <p className={`${PATH_HINT} text-sky-300/90`}>مسار المزايدة</p>
                                <button
                                    type="button"
                                    onClick={actionClick(() =>
                                        submitSubtype(
                                            'طلب تحديد موعد مزايدة علنية للمال المنقول.',
                                            'طلب تحديد موعد مزايدة — مال منقول (قيد البت لدى المنفذ)',
                                            'movable_auction_date'
                                        )
                                    )}
                                    className={`${BTN} border-sky-400/25 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15`}
                                >
                                    طلب تحديد موعد مزايدة
                                </button>
                            </div>
                        </div>
                    );
                }

                if (step2Lane === 'objection') {
                    return (
                        <div className={ACTION_SHELL}>
                            <div className="space-y-2 rounded-2xl border border-amber-500/20 bg-amber-950/10 p-3">
                                <p className={`${PATH_HINT} text-amber-300/90`}>
                                    مسار الاعتراض على التقدير
                                </p>
                                <p className="text-[9px] text-slate-400 text-right leading-relaxed">
                                    يُرسل الطلب فوراً — يُبَتّ من قسم «القرارات والطعون».
                                </p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={actionClick(() => submitObjectionRequest('report'))}
                                        className={`${BTN} border-rose-400/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15`}
                                    >
                                        اعتراض على التقرير
                                    </button>
                                    <button
                                        type="button"
                                        onClick={actionClick(() => submitObjectionRequest('experts'))}
                                        className={`${BTN} border-amber-400/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15`}
                                    >
                                        اعتراض على الخبراء
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                }

                return (
                    <div className={ACTION_SHELL}>
                        <p className={`${PATH_HINT} text-slate-400`}>اختر مسار الإجراء</p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setStep2Lane('auction');
                                }}
                                className={laneBtnCls(
                                    'auction',
                                    'border-sky-400/25 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15'
                                )}
                            >
                                مسار المزايدة
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setStep2Lane('objection');
                                }}
                                className={laneBtnCls(
                                    'objection',
                                    'border-amber-400/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15'
                                )}
                            >
                                مسار الاعتراض على التقدير
                            </button>
                        </div>
                    </div>
                );
            }

            if (stepIndex === 3 && normStatus === 'estimation_objected') {
                if (hasPendingSubtype('movable_expert_committee')) {
                    return renderStepPendingMirror(3, 'movable_expert_committee');
                }
                if (expertCommitteeApprovedUnsaved) {
                    if (dismissedApprovedInlineForStep === 3) {
                        return renderApprovedInlineResume(
                            'تمت الموافقة على لجنة الخبراء — أكمل التسجيل',
                            () => setDismissedApprovedInlineForStep(null)
                        );
                    }
                    return inlineSaveShell(inline);
                }
                return (
                    <div className={ACTION_SHELL}>
                        <button
                            type="button"
                            onClick={actionClick(() => {
                                const required = readExpertCommitteeSize(m);
                                submitSubtype(
                                    'طلب انتداب لجنة خبراء جديدة لتقدير المال المنقول بعد الاعتراض.',
                                    'طلب انتداب لجنة خبراء جديدة — مال منقول (قيد البت لدى المنفذ)',
                                    'movable_expert_committee',
                                    [`عدد الخبراء المطلوب: ${required}`]
                                );
                            })}
                            className={`${BTN} border-amber-400/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15`}
                        >
                            طلب انتداب لجنة خبراء جديدة
                        </button>
                    </div>
                );
            }

            if (stepIndex === 4 && normStatus === 'published') {
                const needsPub =
                    !String(m.newspaperName || '').trim() || !String(m.publicationDateYmd || '').trim();
                if (!needsPub) return inline;
                return inline;
            }

            if (stepIndex === 5 && normStatus === 'published') {
                const needsPub =
                    !String(m.newspaperName || '').trim() || !String(m.publicationDateYmd || '').trim();
                if (needsPub) return null;
                return inline;
            }

            if (stepIndex === 6 && normStatus === 'no_bidders') {
                if (hasPendingSubtype('movable_auction_date')) {
                    return renderStepPendingMirror(6, 'movable_auction_date');
                }
                if (auctionApprovedUnsaved) {
                    if (dismissedApprovedInlineForStep === 6) {
                        return renderApprovedInlineResume(
                            'تمت الموافقة على موعد المزايدة الجديد — أكمل التسجيل',
                            () => setDismissedApprovedInlineForStep(null)
                        );
                    }
                    return inlineSaveShell(inline);
                }
                return (
                    <div className={ACTION_SHELL}>
                        <button
                            type="button"
                            onClick={actionClick(() =>
                                submitSubtype(
                                    'طلب تحديد موعد مزايدة جديد (كسر القرار) للمال المنقول.',
                                    'طلب تحديد موعد مزايدة جديد — مال منقول (قيد البت لدى المنفذ)',
                                    'movable_auction_date'
                                )
                            )}
                            className={`${BTN} border-sky-400/25 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15`}
                        >
                            طلب تحديد موعد مزايدة جديد (كسر القرار)
                        </button>
                    </div>
                );
            }

            if (stepIndex === 7 && normStatus === 'initial_award') {
                if (hasAnyPendingForStep(7)) {
                    return renderStepPendingMirror(7);
                }
                if (reauctionApprovedUnsaved) {
                    if (dismissedApprovedInlineForStep === 7) {
                        return renderApprovedInlineResume(
                            'تمت الموافقة على إعادة المزايدة — أكمل التسجيل',
                            () => setDismissedApprovedInlineForStep(null)
                        );
                    }
                    return inlineSaveShell(renderInlineForStep(7, 'reauction_default'));
                }
                return (
                    <div className={ACTION_SHELL}>
                        <p className={`${PATH_HINT} text-slate-400`}>اختر أحد الإجراءات التالية</p>
                        <button
                            type="button"
                            onClick={actionClick(() =>
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
                                    ].filter(Boolean)
                                )
                            )}
                            className={`${BTN} border-emerald-400/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15`}
                        >
                            طلب إحالة قطعية
                        </button>
                        <button
                            type="button"
                            onClick={actionClick(() =>
                                submitSubtype(
                                    'طلب إعادة المزايدة للنكول (تهرب المشتري من الدفع) للمال المنقول.',
                                    'طلب إعادة المزايدة للنكول — مال منقول (قيد البت لدى المنفذ)',
                                    'movable_reauction_default'
                                )
                            )}
                            className={`${BTN} border-rose-400/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15`}
                        >
                            طلب إعادة المزايدة للنكول
                        </button>
                    </div>
                );
            }

            if (stepIndex === 7 && normStatus === 'sold') {
                if (proceedsDone) {
                    return (
                        <p className="text-[10px] font-bold text-emerald-200/90 text-right">
                            تمت الإحالة القطعية وصرف الحصيلة في السجل المالي.
                        </p>
                    );
                }
                return (
                    <div className={ACTION_SHELL}>
                        <p className="text-[10px] font-bold text-emerald-200/90 text-right leading-relaxed">
                            تمت الإحالة القطعية — يمكنك نقل حصيلة البيع إلى السجل المالي (الأمانات).
                        </p>
                        <button
                            type="button"
                            onClick={actionClick(openTrustDisburseForProceeds)}
                            className={`${BTN} border-emerald-400/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15`}
                        >
                            نقل حصيلة البيع — السجل المالي
                        </button>
                    </div>
                );
            }

            return inline;
        },
        [
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
            optimisticObjectionDecisionId,
            submitObjectionRequest,
            renderStepPendingMirror,
            dismissedApprovedInlineForStep,
            renderApprovedInlineResume,
            proceedsDone,
            openTrustDisburseForProceeds,
        ]
    );

    const steps: ExecutionInlineStep[] = React.useMemo(() => {
        return STEP_TITLES.map((title, idx) => {
            const st = stepStatusForIndex(idx, activeIdx);
            const isActive = st === 'active';
            const pendingOnStep = isActive && hasWithdrawablePending;
            const content = contentForStepIndex(idx);
            return {
                id: `movable_step_${idx}`,
                title,
                subtitle: st === 'done'
                    ? 'اضغط لعرض التفاصيل'
                    : pendingOnStep
                      ? 'قيد البت'
                      : isActive
                        ? 'الخطوة الحالية'
                        : undefined,
                status: st,
                tone: st === 'done' ? 'success' : isActive ? 'neutral' : 'neutral',
                content: content || null,
                ...(isActive && showStepBack
                    ? {
                          showBack: true,
                          onBack: handleActiveStepBack,
                          backLabel: stepBackLabel,
                      }
                    : {}),
            } satisfies ExecutionInlineStep;
        });
    }, [
        activeIdx,
        contentForStepIndex,
        hasWithdrawablePending,
        showStepBack,
        handleActiveStepBack,
        stepBackLabel,
    ]);

    return (
        <div className="mt-3 border-t border-white/10 pt-3" dir="rtl">
            <button
                type="button"
                aria-expanded={workflowExpanded}
                onClick={() => setWorkflowExpanded((v) => !v)}
                className="flex w-full flex-row-reverse items-center justify-between gap-2 rounded-xl py-1 text-right transition hover:bg-white/5"
            >
                <span className="text-[11px] font-black text-sky-200">إجراءات حجز المنقول</span>
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-sky-300/85 transition-transform ${workflowExpanded ? 'rotate-180' : ''}`}
                />
            </button>

            {workflowExpanded ? (
                <div className="relative">
                    <ExecutionInlineAccordion
                        className={relevantPendingRows.length > 0 ? 'mt-2' : 'mt-3'}
                        steps={steps}
                        stepNavRequest={stepNavRequest}
                    />
                </div>
            ) : null}
        </div>
    );
};
