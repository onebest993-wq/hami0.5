import React from 'react';
import type { SeizedMovable, SeizedProperty } from '@/app/types/execution';
import {
    withdrawPendingMovableDecisionsForStep,
} from '../../../utils/movableSeizureWorkflowUtils';
import { withdrawPendingPropertyDecisionsForStep } from '../../../utils/propertySeizureWorkflowUtils';
import {
    MovableSeizureInlineSections,
    type MovableInlineSectionKey,
} from '../../MovableSeizureInlineSections';
import {
    PropertySeizureInlineSections,
    type PropertyInlineSectionKey,
} from '../../PropertySeizureInlineSections';
import {
    isSeizureWorkflowNestedView,
    seizureWorkflowStepBackLabel,
    shouldShowSeizureWorkflowStepBack,
    type SeizureWorkflowStepBackContext,
} from '../../../utils/seizureWorkflowStepBackUtils';
import {
    applyMovableWorkflowRevert,
    applyPropertyWorkflowRevert,
} from '../../../utils/seizureWorkflowRevertUtils';
import {
    expertSubtypeForMovableWorkflowStep,
    inlineSectionForMovableWorkflowStep,
} from '../../seizedMovableWorkflow/seizedMovableWorkflowUiHelpers';
import {
    expertSubtypeForPropertyWorkflowStep,
    inlineSectionForPropertyWorkflowStep,
} from '../../seizedPropertyWorkflow/seizedPropertyWorkflowUiHelpers';
import type { SeizedAssetWorkflowFoundation } from './useSeizedAssetWorkflowFoundation';

/** Inline section renderers, lane sync effects, and step-back / withdraw handlers. */
export function useSeizedAssetWorkflowHandlers(f: SeizedAssetWorkflowFoundation) {
    const {
        input,
        assetKind,
        decisions,
        showToast,
        decisionsReloadEpoch,
        entities,
        entityId,
        stepIdPrefix,
        inlineLiveTick,
        liveEntity,
        engine,
        dossierId,
        workflowNormStatus,
        liveActiveIdx,
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
        hasAnyPendingForStep,
        handleWithdrawPendingForStep,
        inlineRemountKey,
        setInlineRemountKey,
        expertApprovedUnsaved,
        expertCommitteeApprovedUnsaved,
        auctionApprovedUnsaved,
        reauctionApprovedUnsaved,
        step2Lane,
        setStep2Lane,
        dismissedApprovedInlineForStep,
        setDismissedApprovedInlineForStep,
        setStepNavRequest,
    } = f;

    const renderInlineForStep = React.useCallback(
        (
            stepIndex: number,
            sectionOverride?: MovableInlineSectionKey | PropertyInlineSectionKey,
        ) => {
            if (assetKind === 'movable') {
                const sectionKey =
                    (sectionOverride as MovableInlineSectionKey | undefined) ??
                    inlineSectionForMovableWorkflowStep(stepIndex);
                if (!sectionKey) return null;
                return (
                    <MovableSeizureInlineSections
                        key={`${stepIndex}-${inlineRemountKey}`}
                        movable={liveEntity as SeizedMovable}
                        movables={entities as SeizedMovable[]}
                        decisions={decisions}
                        saveCtx={input.movableInlineSaveCtx}
                        focusKey={inlineFocusKey}
                        pendingDecisionId={pendingDecisionId}
                        section={sectionKey}
                        embedded
                        expertDecisionSubtype={expertSubtypeForMovableWorkflowStep(stepIndex)}
                    />
                );
            }
            const sectionKey =
                (sectionOverride as PropertyInlineSectionKey | undefined) ??
                inlineSectionForPropertyWorkflowStep(stepIndex);
            if (!sectionKey) return null;
            return (
                <PropertySeizureInlineSections
                    key={`${stepIndex}-${inlineRemountKey}`}
                    property={liveEntity as SeizedProperty}
                    properties={entities as SeizedProperty[]}
                    decisions={decisions}
                    saveCtx={input.propertyInlineSaveCtx}
                    focusKey={inlineFocusKey}
                    pendingDecisionId={pendingDecisionId}
                    section={sectionKey}
                    embedded
                    expertDecisionSubtype={expertSubtypeForPropertyWorkflowStep(stepIndex)}
                />
            );
        },
        [
            assetKind,
            liveEntity,
            entities,
            decisions,
            input,
            inlineFocusKey,
            pendingDecisionId,
            inlineRemountKey,
            decisionsReloadEpoch,
        ],
    );

    React.useEffect(() => {
        if (inlineLiveTick === 0) return;
        setInlineRemountKey((k) => k + 1);
        setStepNavRequest({
            targetStepId: `${stepIdPrefix}_${liveActiveIdx}`,
            collapseStepId:
                liveActiveIdx > 0 ? `${stepIdPrefix}_${liveActiveIdx - 1}` : undefined,
            seq: Date.now(),
        });
    }, [inlineLiveTick, liveActiveIdx, stepIdPrefix, setInlineRemountKey, setStepNavRequest]);

    React.useEffect(() => {
        if (!optimisticObjectionDecisionId && !Object.keys(optimisticPendingBySubtype).length) {
            return;
        }
        setInlineRemountKey((k) => k + 1);
        setStepNavRequest({
            targetStepId: `${stepIdPrefix}_${liveActiveIdx}`,
            seq: Date.now(),
        });
    }, [
        optimisticObjectionDecisionId,
        optimisticPendingBySubtype,
        liveActiveIdx,
        stepIdPrefix,
        setInlineRemountKey,
        setStepNavRequest,
    ]);

    React.useEffect(() => {
        const pending = engine.findDecision(
            decisions,
            engine.plugin.expertObjectionSubtype,
            entityId,
            { pendingOnly: true },
        );
        if (pending) {
            setStep2Lane('objection');
            setOptimisticObjectionDecisionId(null);
        }
    }, [
        decisions,
        entityId,
        decisionsReloadEpoch,
        engine,
        setOptimisticObjectionDecisionId,
        setStep2Lane,
    ]);

    React.useEffect(() => {
        if (workflowNormStatus !== 'valued') {
            setStep2Lane(null);
            setOptimisticObjectionDecisionId(null);
        }
    }, [workflowNormStatus, setOptimisticObjectionDecisionId, setStep2Lane]);

    React.useEffect(() => {
        setDismissedApprovedInlineForStep(null);
    }, [liveActiveIdx, setDismissedApprovedInlineForStep]);

    const submitObjectionRequest = React.useCallback(
        (objectionKind: 'report' | 'experts') => {
            const lead =
                objectionKind === 'experts'
                    ? 'طلب الاعتراض على الخبراء (استبدالهم دون زيادة العدد).'
                    : assetKind === 'movable'
                      ? 'طلب الاعتراض على تقرير الخبراء (تقدير المال المنقول).'
                      : 'طلب الاعتراض على تقرير الخبراء (تقدير العقار).';
            const title =
                objectionKind === 'experts'
                    ? assetKind === 'movable'
                      ? 'طلب الاعتراض على الخبراء — مال منقول (قيد البت لدى المنفذ)'
                      : 'طلب الاعتراض على الخبراء — عقار (قيد البت لدى المنفذ)'
                    : assetKind === 'movable'
                      ? 'طلب الاعتراض على تقرير الخبراء — مال منقول (قيد البت لدى المنفذ)'
                      : 'طلب الاعتراض على تقرير الخبراء — عقار (قيد البت لدى المنفذ)';
            setStep2Lane('objection');
            const did = submitSubtype(
                lead,
                title,
                engine.plugin.expertObjectionSubtype,
                String(liveEntity.expertReportDateYmd || '').trim()
                    ? [`تاريخ التقرير: ${String(liveEntity.expertReportDateYmd || '').trim()}`]
                    : [],
                { objectionKind },
            );
            if (did) {
                setOptimisticObjectionDecisionId(did);
                setWorkflowExpanded(true);
                setInlineRemountKey((k) => k + 1);
                setStepNavRequest({
                    targetStepId: `${stepIdPrefix}_${liveActiveIdx}`,
                    seq: Date.now(),
                });
            }
        },
        [
            assetKind,
            submitSubtype,
            liveEntity,
            engine.plugin,
            setWorkflowExpanded,
            setOptimisticObjectionDecisionId,
            liveActiveIdx,
            stepIdPrefix,
            setStep2Lane,
            setInlineRemountKey,
            setStepNavRequest,
        ],
    );

    const handleWithdrawPendingRequest = React.useCallback(() => {
        const withdrawn =
            assetKind === 'movable'
                ? withdrawPendingMovableDecisionsForStep(
                      dossierId,
                      decisions,
                      entityId,
                      liveActiveIdx,
                  )
                : withdrawPendingPropertyDecisionsForStep(
                      dossierId,
                      decisions,
                      entityId,
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
        assetKind,
        dossierId,
        decisions,
        entityId,
        liveActiveIdx,
        showToast,
        handleWithdrawPendingForStep,
        setOptimisticObjectionDecisionId,
        setOptimisticPendingBySubtype,
        setStep2Lane,
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
            if (assetKind === 'movable') {
                const result = applyMovableWorkflowRevert(
                    entities as SeizedMovable[],
                    entityId,
                );
                if (!result) {
                    showToast('تعذر التراجع عن هذه الخطوة.', 'warning');
                    return;
                }
                input.movableInlineSaveCtx.persistMovables(result.next);
                setStep2Lane(null);
                setOptimisticObjectionDecisionId(null);
                setDismissedApprovedInlineForStep(null);
                setInlineFocusKey(null);
                setPendingDecisionId(null);
                setInlineRemountKey((k) => k + 1);
                setStepNavRequest({
                    targetStepId: `${stepIdPrefix}_${result.newActiveIdx}`,
                    seq: Date.now(),
                });
                return;
            }
            const result = applyPropertyWorkflowRevert(
                entities as SeizedProperty[],
                entityId,
            );
            if (!result) {
                showToast('تعذر التراجع عن هذه الخطوة.', 'warning');
                return;
            }
            input.propertyInlineSaveCtx.persistProperties(result.next);
            setStep2Lane(null);
            setOptimisticObjectionDecisionId(null);
            setDismissedApprovedInlineForStep(null);
            setInlineFocusKey(null);
            setPendingDecisionId(null);
            setInlineRemountKey((k) => k + 1);
            setStepNavRequest({
                targetStepId: `${stepIdPrefix}_${result.newActiveIdx}`,
                seq: Date.now(),
            });
        }
    }, [
        assetKind,
        stepBackContext,
        handleWithdrawPendingRequest,
        inlineFocusKey,
        liveActiveIdx,
        entities,
        entityId,
        input,
        showToast,
        setInlineFocusKey,
        setPendingDecisionId,
        setOptimisticObjectionDecisionId,
        setStep2Lane,
        stepIdPrefix,
        setDismissedApprovedInlineForStep,
        setInlineRemountKey,
        setStepNavRequest,
    ]);

    const stepBackLabel = seizureWorkflowStepBackLabel(stepBackContext);
    const showStepBack = shouldShowSeizureWorkflowStepBack(stepBackContext);

    return {
        renderInlineForStep,
        submitObjectionRequest,
        handleWithdrawPendingRequest,
        handleActiveStepBack,
        stepBackLabel,
        showStepBack,
    };
}

export type SeizedAssetWorkflowHandlers = ReturnType<typeof useSeizedAssetWorkflowHandlers>;
