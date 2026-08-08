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
    withdrawPendingPropertyDecisionsForStep,
} from '../../utils/propertySeizureWorkflowUtils';
import {
    PropertySeizureInlineSections,
    type PropertyInlineSectionKey,
} from '../PropertySeizureInlineSections';
import { ExecutorDecisionFollowupMirror } from '../ExecutorDecisionFollowupMirror';
import {
    isSeizureWorkflowNestedView,
    seizureWorkflowStepBackLabel,
    shouldShowSeizureWorkflowStepBack,
    type SeizureWorkflowStepBackContext,
} from '../../utils/seizureWorkflowStepBackUtils';
import { applyPropertyWorkflowRevert } from '../../utils/seizureWorkflowRevertUtils';
import {
    readSeizureWorkflowLaneSession,
    writeSeizureWorkflowLaneSession,
} from '@/app/domain/seizure/seizureWorkflowLaneSession';
import { PROPERTY_WORKFLOW_ACTION_SHELL, PROPERTY_WORKFLOW_STEP_TITLES } from './seizedPropertyWorkflowConstants';
import type {
    PropertyWorkflowStep2Lane,
    PropertyWorkflowStepNavRequest,
    SeizedPropertyWorkflowPanelProps,
} from './seizedPropertyWorkflowTypes';
import {
    expertSubtypeForPropertyWorkflowStep,
    inlineSectionForPropertyWorkflowStep,
} from './seizedPropertyWorkflowUiHelpers';
import {
    buildPropertyWorkflowStepContent,
    resolvePropertyWorkflowPendingRowForStep,
} from './buildPropertyWorkflowStepContent';
import { SeizureWorkflowPendingFallback } from '../seizedMovableWorkflow/seizureWorkflowPendingFallback';

export function useSeizedPropertyWorkflowPanelState({
    property: p,
    workflowStatus: status,
    decisionsStorageExecutionId,
    executionId,
    executionDataId,
    executionData,
    decisions,
    properties,
    propertyInlineSaveCtx,
    showToast,
    decisionsReloadEpoch = 0,
    appealPerspective = 'creditor_agent',
}: SeizedPropertyWorkflowPanelProps) {
    const propertyId = String(p.id || '').trim();

    const inlineLiveTick = useSeizureInlineLiveTick(
        propertyId,
        ['hami-seized-property-inline-updated'],
        'propertyId',
    );

    const liveP = React.useMemo(() => {
        const fromList = properties.find((row) => String(row.id || '').trim() === propertyId);
        const fromCtx = propertyInlineSaveCtx.readProperties?.().find(
            (row) => String(row.id || '').trim() === propertyId,
        );
        return mergeSeizureLiveEntity(p, fromList, fromCtx);
    }, [p, properties, propertyId, propertyInlineSaveCtx, inlineLiveTick]);

    const core = useSeizureAssetWorkflowPanelCore({
        assetKind: 'property',
        entity: liveP,
        entityId: propertyId,
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
        inlineUpdatedEventNames: ['hami-seized-property-inline-updated'],
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

    const proceedsDone = Boolean(String(liveP.proceedsDisburseCompletedAtIso || '').trim());

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
                        seizedPropertyId: propertyId,
                    },
                }),
            );
        } catch {
            /* ignore */
        }
    }, [engine, dossierId, propertyId, showToast]);

    const renderInlineForStep = React.useCallback(
        (stepIndex: number, sectionOverride?: PropertyInlineSectionKey) => {
            const sectionKey = sectionOverride ?? inlineSectionForPropertyWorkflowStep(stepIndex);
            if (!sectionKey) return null;
            return (
                <PropertySeizureInlineSections
                    key={`${stepIndex}-${inlineRemountKey}`}
                    property={liveP}
                    properties={properties}
                    decisions={decisions}
                    saveCtx={propertyInlineSaveCtx}
                    focusKey={inlineFocusKey}
                    pendingDecisionId={pendingDecisionId}
                    section={sectionKey}
                    embedded
                    expertDecisionSubtype={expertSubtypeForPropertyWorkflowStep(stepIndex)}
                />
            );
        },
        [
            liveP,
            properties,
            decisions,
            propertyInlineSaveCtx,
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
                propertyId,
            ),
        [decisions, propertyId, decisionsReloadEpoch, engine.plugin],
    );

    const expertCommitteeApprovedUnsaved = React.useMemo(
        () =>
            findApprovedUnsavedSeizureDecision(
                decisions,
                engine.plugin,
                engine.plugin.expertCommitteeSubtype,
                propertyId,
            ),
        [decisions, propertyId, decisionsReloadEpoch, engine.plugin],
    );

    const auctionApprovedUnsaved = React.useMemo(
        () =>
            findApprovedUnsavedSeizureDecision(
                decisions,
                engine.plugin,
                engine.plugin.auctionSubtype,
                propertyId,
            ),
        [decisions, propertyId, decisionsReloadEpoch, engine.plugin],
    );

    const reauctionApprovedUnsaved = React.useMemo(
        () =>
            findApprovedUnsavedSeizureDecision(
                decisions,
                engine.plugin,
                engine.plugin.reauctionDefaultSubtype,
                propertyId,
            ),
        [decisions, propertyId, decisionsReloadEpoch, engine.plugin],
    );

    const laneSessionKey = `property:${propertyId}`;
    const [step2Lane, setStep2LaneRaw] = React.useState<PropertyWorkflowStep2Lane | null>(
        () => readSeizureWorkflowLaneSession(laneSessionKey),
    );
    const setStep2Lane = React.useCallback(
        (value: React.SetStateAction<PropertyWorkflowStep2Lane | null>) => {
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
    const [stepNavRequest, setStepNavRequest] = React.useState<PropertyWorkflowStepNavRequest | null>(
        null,
    );

    React.useEffect(() => {
        if (inlineLiveTick === 0) return;
        setInlineRemountKey((k) => k + 1);
        setStepNavRequest({
            targetStepId: `property_step_${liveActiveIdx}`,
            collapseStepId:
                liveActiveIdx > 0 ? `property_step_${liveActiveIdx - 1}` : undefined,
            seq: Date.now(),
        });
    }, [inlineLiveTick, liveActiveIdx]);

    React.useEffect(() => {
        if (!optimisticObjectionDecisionId && !Object.keys(optimisticPendingBySubtype).length) {
            return;
        }
        setInlineRemountKey((k) => k + 1);
        setStepNavRequest({
            targetStepId: `property_step_${liveActiveIdx}`,
            seq: Date.now(),
        });
    }, [optimisticObjectionDecisionId, optimisticPendingBySubtype, liveActiveIdx]);

    React.useEffect(() => {
        const pending = engine.findDecision(
            decisions,
            engine.plugin.expertObjectionSubtype,
            propertyId,
            { pendingOnly: true },
        );
        if (pending) {
            setStep2Lane('objection');
            setOptimisticObjectionDecisionId(null);
        }
    }, [decisions, propertyId, decisionsReloadEpoch, engine]);

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
                    : 'طلب الاعتراض على تقرير الخبراء (تقدير العقار).';
            const title =
                objectionKind === 'experts'
                    ? 'طلب الاعتراض على الخبراء — عقار (قيد البت لدى المنفذ)'
                    : 'طلب الاعتراض على تقرير الخبراء — عقار (قيد البت لدى المنفذ)';
            setStep2Lane('objection');
            const did = submitSubtype(
                lead,
                title,
                engine.plugin.expertObjectionSubtype,
                String(liveP.expertReportDateYmd || '').trim()
                    ? [`تاريخ التقرير: ${String(liveP.expertReportDateYmd || '').trim()}`]
                    : [],
                { objectionKind },
            );
            if (did) {
                setOptimisticObjectionDecisionId(did);
                setWorkflowExpanded(true);
                setInlineRemountKey((k) => k + 1);
                setStepNavRequest({
                    targetStepId: `property_step_${liveActiveIdx}`,
                    seq: Date.now(),
                });
            }
        },
        [
            submitSubtype,
            liveP,
            engine.plugin,
            setWorkflowExpanded,
            setOptimisticObjectionDecisionId,
            liveActiveIdx,
        ],
    );

    const handleWithdrawPendingRequest = React.useCallback(() => {
        const withdrawn = withdrawPendingPropertyDecisionsForStep(
            dossierId,
            decisions,
            propertyId,
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
        propertyId,
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
            const result = applyPropertyWorkflowRevert(properties, propertyId);
            if (!result) {
                showToast('تعذر التراجع عن هذه الخطوة.', 'warning');
                return;
            }
            propertyInlineSaveCtx.persistProperties(result.next);
            setStep2Lane(null);
            setOptimisticObjectionDecisionId(null);
            setDismissedApprovedInlineForStep(null);
            setInlineFocusKey(null);
            setPendingDecisionId(null);
            setInlineRemountKey((k) => k + 1);
            setStepNavRequest({
                targetStepId: `property_step_${result.newActiveIdx}`,
                seq: Date.now(),
            });
        }
    }, [
        stepBackContext,
        handleWithdrawPendingRequest,
        inlineFocusKey,
        liveActiveIdx,
        properties,
        propertyId,
        propertyInlineSaveCtx,
        showToast,
        setInlineFocusKey,
        setPendingDecisionId,
        setOptimisticObjectionDecisionId,
    ]);

    const stepBackLabel = seizureWorkflowStepBackLabel(stepBackContext);
    const showStepBack = shouldShowSeizureWorkflowStepBack(stepBackContext);

    const renderStepPendingMirror = React.useCallback(
        (stepIndex: number, preferredSubtype?: string): React.ReactNode => {
            const row = resolvePropertyWorkflowPendingRowForStep(
                workflowDecisions,
                propertyId,
                stepIndex,
                optimisticObjectionDecisionId,
                preferredSubtype,
                optimisticPendingBySubtype,
            );
            if (!row) {
                const subtype = String(preferredSubtype || '').trim();
                if (subtype && hasPendingSubtype(subtype)) {
                    return (
                        <div className={PROPERTY_WORKFLOW_ACTION_SHELL}>
                            <SeizureWorkflowPendingFallback
                                title={
                                    subtype === 'property_expert_objection'
                                        ? 'طلب الاعتراض على التقدير — قيد البت'
                                        : subtype === 'property_expert'
                                          ? 'طلب انتداب خبراء — قيد البت'
                                          : subtype === 'property_auction'
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
                    <div className={PROPERTY_WORKFLOW_ACTION_SHELL}>
                        <SeizureWorkflowPendingFallback
                            title={
                                subtype === 'property_expert_objection'
                                    ? 'طلب الاعتراض على التقدير — قيد البت'
                                    : 'طلب حجز — قيد البت لدى المنفذ'
                            }
                        />
                    </div>
                );
            }
            return (
                <div className={PROPERTY_WORKFLOW_ACTION_SHELL}>
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
            propertyId,
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
            p: liveP,
            propertyId,
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
            liveP,
            propertyId,
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
        (stepIndex: number) => buildPropertyWorkflowStepContent(stepContentDeps, stepIndex),
        [stepContentDeps],
    );

    const doneStepSubtitle = React.useCallback(
        (stepIndex: number): string => {
            const history = buildSeizureWorkflowStepHistory(
                stepIndex,
                liveP,
                decisions,
                engine.plugin,
                propertyId,
            );
            if (!history.length) return 'اضغط لعرض التفاصيل';
            const first = history[0];
            const text = `${first.label}: ${first.value}`;
            return text.length > 52 ? `${text.slice(0, 49)}…` : text;
        },
        [liveP, decisions, propertyId, engine.plugin, decisionsReloadEpoch],
    );

    const steps: ExecutionInlineStep[] = React.useMemo(() => {
        return PROPERTY_WORKFLOW_STEP_TITLES.map((title, idx) => {
            const st = stepStatusForIndex(idx, liveActiveIdx);
            const isActive = st === 'active';
            const pendingOnStep = isActive && hasWithdrawablePending;
            const content = contentForStepIndex(idx);
            return {
                id: `property_step_${idx}`,
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

export type SeizedPropertyWorkflowPanelState = ReturnType<typeof useSeizedPropertyWorkflowPanelState>;
