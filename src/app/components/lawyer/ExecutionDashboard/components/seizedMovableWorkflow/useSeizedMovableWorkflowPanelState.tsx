import React from 'react';
import { mergeSeizureLiveEntity } from '@/app/domain/seizure/mergeSeizureLiveEntity';
import { useSeizureInlineLiveTick } from '@/app/domain/seizure/useSeizureInlineLiveTick';
import { useSeizureAssetWorkflowPanelCore } from '@/app/domain/seizure/useSeizureAssetWorkflowPanelCore';
import {
    buildSeizureWorkflowStepHistory,
    findApprovedUnsavedSeizureDecision,
} from '@/app/domain/seizure/seizureWorkflowDecisionQueries';
import type { ExecutionInlineStep } from '../ExecutionInlineAccordion';
import {
    stepStatusForIndex,
    withdrawPendingMovableDecisionsForStep,
} from '../../utils/movableSeizureWorkflowUtils';
import {
    MovableSeizureInlineSections,
    type MovableInlineSectionKey,
} from '../MovableSeizureInlineSections';
import { ExecutorDecisionFollowupMirror } from '../ExecutorDecisionFollowupMirror';
import {
    isSeizureWorkflowNestedView,
    seizureWorkflowStepBackLabel,
    shouldShowSeizureWorkflowStepBack,
    type SeizureWorkflowStepBackContext,
} from '../../utils/seizureWorkflowStepBackUtils';
import { applyMovableWorkflowRevert } from '../../utils/seizureWorkflowRevertUtils';
import {
    readSeizureWorkflowLaneSession,
    writeSeizureWorkflowLaneSession,
} from '@/app/domain/seizure/seizureWorkflowLaneSession';
import { MOVABLE_WORKFLOW_ACTION_SHELL, MOVABLE_WORKFLOW_STEP_TITLES } from './seizedMovableWorkflowConstants';
import type {
    MovableWorkflowStep2Lane,
    MovableWorkflowStepNavRequest,
    SeizedMovableWorkflowPanelProps,
} from './seizedMovableWorkflowTypes';
import {
    expertSubtypeForMovableWorkflowStep,
    inlineSectionForMovableWorkflowStep,
} from './seizedMovableWorkflowUiHelpers';
import {
    buildMovableWorkflowStepContent,
    resolveMovableWorkflowPendingRowForStep,
} from './buildMovableWorkflowStepContent';
import { SeizureWorkflowPendingFallback } from './seizureWorkflowPendingFallback';

export function useSeizedMovableWorkflowPanelState({
    movable: m,
    workflowStatus: status,
    decisionsStorageExecutionId,
    executionId,
    executionDataId,
    executionData,
    decisions,
    movables,
    movableInlineSaveCtx,
    showToast,
    decisionsReloadEpoch = 0,
    appealPerspective = 'creditor_agent',
}: SeizedMovableWorkflowPanelProps) {
    const movableId = String(m.id || '').trim();

    const inlineLiveTick = useSeizureInlineLiveTick(movableId, [
        'hami-seized-movable-inline-updated',
        'hami-seized-movable-init-saved',
    ], 'movableId');

    const liveM = React.useMemo(() => {
        const fromList = movables.find((row) => String(row.id || '').trim() === movableId);
        const fromCtx = movableInlineSaveCtx.readMovables?.().find(
            (row) => String(row.id || '').trim() === movableId,
        );
        return mergeSeizureLiveEntity(m, fromList, fromCtx);
    }, [m, movables, movableId, movableInlineSaveCtx, inlineLiveTick]);

    const core = useSeizureAssetWorkflowPanelCore({
        assetKind: 'movable',
        entity: liveM,
        entityId: movableId,
        workflowStatus: status,
        decisions,
        decisionsReloadEpoch,
        dossierInput: {
            decisionsStorageExecutionId,
            executionId,
            executionDataId,
            executionData,
        },
        showToast,
    });

    const {
        engine,
        dossierId,
        normStatus: workflowNormStatus,
        activeIdx: liveActiveIdx,
        workflowDecisions,
        relevantPendingRows,
        workflowExpanded,
        setWorkflowExpanded,
        inlineFocusKey,
        setInlineFocusKey,
        pendingDecisionId,
        setPendingDecisionId,
        optimisticPendingBySubtype,
        setOptimisticPendingBySubtype,
        optimisticObjectionDecisionId,
        setOptimisticObjectionDecisionId,
        submitSubtype,
        hasPendingSubtype,
        hasAnyPendingForStep,
        handleWithdrawPendingForStep,
        hasWithdrawablePending,
    } = core;

    const [inlineRemountKey, setInlineRemountKey] = React.useState(0);

    const proceedsDone = Boolean(String(liveM.proceedsDisburseCompletedAtIso || '').trim());

    const openTrustDisburseForProceeds = React.useCallback(() => {
        if (!engine.isValidDossier(dossierId)) {
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
                }),
            );
        } catch {
            /* ignore */
        }
    }, [engine, dossierId, movableId, showToast]);

    const renderInlineForStep = React.useCallback(
        (stepIndex: number, sectionOverride?: MovableInlineSectionKey) => {
            const sectionKey = sectionOverride ?? inlineSectionForMovableWorkflowStep(stepIndex);
            if (!sectionKey) return null;
            return (
                <MovableSeizureInlineSections
                    key={`${stepIndex}-${inlineRemountKey}`}
                    movable={liveM}
                    movables={movables}
                    decisions={decisions}
                    saveCtx={movableInlineSaveCtx}
                    focusKey={inlineFocusKey}
                    pendingDecisionId={pendingDecisionId}
                    section={sectionKey}
                    embedded
                    expertDecisionSubtype={expertSubtypeForMovableWorkflowStep(stepIndex)}
                />
            );
        },
        [
            liveM,
            movables,
            decisions,
            movableInlineSaveCtx,
            inlineFocusKey,
            pendingDecisionId,
            inlineRemountKey,
            decisionsReloadEpoch,
        ],
    );

    const expertApprovedUnsaved = React.useMemo(
        () =>
            findApprovedUnsavedSeizureDecision(
                decisions,
                engine.plugin,
                engine.plugin.expertSubtype,
                movableId,
            ),
        [decisions, movableId, decisionsReloadEpoch, engine.plugin],
    );

    const expertCommitteeApprovedUnsaved = React.useMemo(
        () =>
            findApprovedUnsavedSeizureDecision(
                decisions,
                engine.plugin,
                engine.plugin.expertCommitteeSubtype,
                movableId,
            ),
        [decisions, movableId, decisionsReloadEpoch, engine.plugin],
    );

    const auctionApprovedUnsaved = React.useMemo(
        () =>
            findApprovedUnsavedSeizureDecision(
                decisions,
                engine.plugin,
                engine.plugin.auctionSubtype,
                movableId,
            ),
        [decisions, movableId, decisionsReloadEpoch, engine.plugin],
    );

    const reauctionApprovedUnsaved = React.useMemo(
        () =>
            findApprovedUnsavedSeizureDecision(
                decisions,
                engine.plugin,
                engine.plugin.reauctionDefaultSubtype,
                movableId,
            ),
        [decisions, movableId, decisionsReloadEpoch, engine.plugin],
    );

    const laneSessionKey = `movable:${movableId}`;
    const [step2Lane, setStep2LaneRaw] = React.useState<MovableWorkflowStep2Lane | null>(
        () => readSeizureWorkflowLaneSession(laneSessionKey),
    );
    const setStep2Lane = React.useCallback(
        (value: React.SetStateAction<MovableWorkflowStep2Lane | null>) => {
            setStep2LaneRaw((prev) => {
                const next = typeof value === 'function' ? value(prev) : value;
                writeSeizureWorkflowLaneSession(laneSessionKey, next);
                return next;
            });
        },
        [laneSessionKey],
    );
    const [dismissedApprovedInlineForStep, setDismissedApprovedInlineForStep] = React.useState<
        number | null
    >(null);
    const [stepNavRequest, setStepNavRequest] = React.useState<MovableWorkflowStepNavRequest | null>(
        null,
    );

    React.useEffect(() => {
        if (inlineLiveTick === 0) return;
        setInlineRemountKey((k) => k + 1);
        setStepNavRequest({
            targetStepId: `movable_step_${liveActiveIdx}`,
            collapseStepId:
                liveActiveIdx > 0 ? `movable_step_${liveActiveIdx - 1}` : undefined,
            seq: Date.now(),
        });
    }, [inlineLiveTick, liveActiveIdx]);

    React.useEffect(() => {
        if (!optimisticObjectionDecisionId && !Object.keys(optimisticPendingBySubtype).length) {
            return;
        }
        setInlineRemountKey((k) => k + 1);
        setStepNavRequest({
            targetStepId: `movable_step_${liveActiveIdx}`,
            seq: Date.now(),
        });
    }, [
        optimisticObjectionDecisionId,
        optimisticPendingBySubtype,
        liveActiveIdx,
    ]);

    React.useEffect(() => {
        const pending = engine.findDecision(
            decisions,
            engine.plugin.expertObjectionSubtype,
            movableId,
            { pendingOnly: true },
        );
        if (pending) {
            setStep2Lane('objection');
            setOptimisticObjectionDecisionId(null);
        }
    }, [decisions, movableId, decisionsReloadEpoch, engine]);

    React.useEffect(() => {
        if (workflowNormStatus !== 'valued') {
            setStep2Lane(null);
            setOptimisticObjectionDecisionId(null);
        }
    }, [workflowNormStatus, setOptimisticObjectionDecisionId]);

    React.useEffect(() => {
        setDismissedApprovedInlineForStep(null);
    }, [liveActiveIdx]);

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
                engine.plugin.expertObjectionSubtype,
                String(liveM.expertReportDateYmd || '').trim()
                    ? [`تاريخ التقرير: ${String(liveM.expertReportDateYmd || '').trim()}`]
                    : [],
                { objectionKind },
            );
            if (did) {
                setOptimisticObjectionDecisionId(did);
                setWorkflowExpanded(true);
                setInlineRemountKey((k) => k + 1);
                setStepNavRequest({
                    targetStepId: `movable_step_${liveActiveIdx}`,
                    seq: Date.now(),
                });
            }
        },
        [
            submitSubtype,
            liveM,
            engine.plugin,
            setWorkflowExpanded,
            setOptimisticObjectionDecisionId,
            liveActiveIdx,
        ],
    );

    const handleWithdrawPendingRequest = React.useCallback(() => {
        const withdrawn = withdrawPendingMovableDecisionsForStep(
            dossierId,
            decisions,
            movableId,
            liveActiveIdx,
        );
        if (withdrawn > 0) {
            setStep2Lane(null);
            setOptimisticObjectionDecisionId(null);
            setOptimisticPendingBySubtype({});
            showToast('تم سحب الطلب المعلّق لدى المنفذ.', 'success');
            return;
        }
        handleWithdrawPendingForStep(liveActiveIdx);
    }, [
        dossierId,
        decisions,
        movableId,
        liveActiveIdx,
        showToast,
        handleWithdrawPendingForStep,
        setOptimisticObjectionDecisionId,
        setOptimisticPendingBySubtype,
    ]);

    const stepBackContext = React.useMemo((): SeizureWorkflowStepBackContext => {
        return {
            activeIdx: liveActiveIdx,
            inlineFocusKey,
            step2Lane,
            hasPendingOnActiveStep: hasAnyPendingForStep(liveActiveIdx),
            hasOptimisticPending: Boolean(String(optimisticObjectionDecisionId || '').trim()),
            dismissedApprovedInlineForStep,
            expertApprovedUnsaved: Boolean(expertApprovedUnsaved),
            expertCommitteeApprovedUnsaved: Boolean(expertCommitteeApprovedUnsaved),
            auctionApprovedUnsaved: Boolean(auctionApprovedUnsaved),
            reauctionApprovedUnsaved: Boolean(reauctionApprovedUnsaved),
        };
    }, [
        liveActiveIdx,
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
            setDismissedApprovedInlineForStep(liveActiveIdx);
            return;
        }
        if (liveActiveIdx > 0) {
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
        liveActiveIdx,
        movables,
        movableId,
        movableInlineSaveCtx,
        showToast,
        setInlineFocusKey,
        setPendingDecisionId,
        setOptimisticObjectionDecisionId,
    ]);

    const stepBackLabel = seizureWorkflowStepBackLabel(stepBackContext);
    const showStepBack = shouldShowSeizureWorkflowStepBack(stepBackContext);

    const renderStepPendingMirror = React.useCallback(
        (stepIndex: number, preferredSubtype?: string): React.ReactNode => {
            const row = resolveMovableWorkflowPendingRowForStep(
                workflowDecisions,
                movableId,
                stepIndex,
                optimisticObjectionDecisionId,
                preferredSubtype,
                optimisticPendingBySubtype,
            );
            if (!row) {
                const subtype = String(preferredSubtype || '').trim();
                if (subtype && hasPendingSubtype(subtype)) {
                    return (
                        <div className={MOVABLE_WORKFLOW_ACTION_SHELL}>
                            <SeizureWorkflowPendingFallback
                                title={
                                    subtype === 'movable_expert_objection'
                                        ? 'طلب الاعتراض على التقدير — قيد البت'
                                        : subtype === 'movable_expert'
                                          ? 'طلب انتداب خبراء — قيد البت'
                                          : subtype === 'movable_auction_date'
                                            ? 'طلب موعد مزايدة — قيد البت'
                                            : 'طلب حجز — قيد البت لدى المنفذ'
                                }
                            />
                        </div>
                    );
                }
                return null;
            }
            if (!engine.isValidDossier(dossierId)) {
                const subtype = String(preferredSubtype || '').trim();
                return (
                    <div className={MOVABLE_WORKFLOW_ACTION_SHELL}>
                        <SeizureWorkflowPendingFallback
                            title={
                                subtype === 'movable_expert_objection'
                                    ? 'طلب الاعتراض على التقدير — قيد البت'
                                    : 'طلب حجز — قيد البت لدى المنفذ'
                            }
                        />
                    </div>
                );
            }
            return (
                <div className={MOVABLE_WORKFLOW_ACTION_SHELL}>
                    <ExecutorDecisionFollowupMirror
                        executionId={dossierId}
                        row={row}
                        requestKind="seizure"
                        compact
                        appealPerspective={appealPerspective}
                    />
                </div>
            );
        },
        [
            workflowDecisions,
            movableId,
            optimisticObjectionDecisionId,
            optimisticPendingBySubtype,
            dossierId,
            appealPerspective,
            decisionsReloadEpoch,
            hasPendingSubtype,
            engine,
        ],
    );

    const stepContentDeps = React.useMemo(
        () => ({
            activeIdx: liveActiveIdx,
            decisions: workflowDecisions,
            normStatus: workflowNormStatus,
            m: liveM,
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
        }),
        [
            liveActiveIdx,
            workflowDecisions,
            workflowNormStatus,
            liveM,
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
            inlineFocusKey,
            pendingDecisionId,
            proceedsDone,
            openTrustDisburseForProceeds,
        ],
    );

    const contentForStepIndex = React.useCallback(
        (stepIndex: number) => buildMovableWorkflowStepContent(stepContentDeps, stepIndex),
        [stepContentDeps],
    );

    const doneStepSubtitle = React.useCallback(
        (stepIndex: number): string => {
            const history = buildSeizureWorkflowStepHistory(
                stepIndex,
                liveM,
                decisions,
                engine.plugin,
                movableId,
            );
            if (!history.length) return 'اضغط لعرض التفاصيل';
            const first = history[0];
            const text = `${first.label}: ${first.value}`;
            return text.length > 52 ? `${text.slice(0, 49)}…` : text;
        },
        [liveM, decisions, movableId, engine.plugin, decisionsReloadEpoch],
    );

    const steps: ExecutionInlineStep[] = React.useMemo(() => {
        return MOVABLE_WORKFLOW_STEP_TITLES.map((title, idx) => {
            const st = stepStatusForIndex(idx, liveActiveIdx);
            const isActive = st === 'active';
            const pendingOnStep = isActive && hasWithdrawablePending;
            const content = contentForStepIndex(idx);
            return {
                id: `movable_step_${idx}`,
                title,
                subtitle: st === 'done'
                    ? doneStepSubtitle(idx)
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
        liveActiveIdx,
        contentForStepIndex,
        doneStepSubtitle,
        hasWithdrawablePending,
        showStepBack,
        handleActiveStepBack,
        stepBackLabel,
    ]);

    return {
        workflowExpanded,
        setWorkflowExpanded,
        relevantPendingRows,
        steps,
        stepNavRequest,
    };
}

export type SeizedMovableWorkflowPanelState = ReturnType<typeof useSeizedMovableWorkflowPanelState>;
