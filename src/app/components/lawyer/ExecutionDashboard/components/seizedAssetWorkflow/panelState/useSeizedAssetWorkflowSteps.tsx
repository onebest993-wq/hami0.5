import React from 'react';
import { buildSeizureWorkflowStepHistory } from '@/app/domain/seizure/seizureWorkflowDecisionQueries';
import type { SeizedMovable, SeizedProperty } from '@/app/types/execution';
import type { ExecutionInlineStep } from '../../ExecutionInlineAccordion';
import { stepStatusForIndex } from '../../../utils/movableSeizureWorkflowUtils';
import { ExecutorDecisionFollowupMirror } from '../../ExecutorDecisionFollowupMirror';
import {
    buildMovableWorkflowStepContent,
    resolveMovableWorkflowPendingRowForStep,
} from '../../seizedMovableWorkflow/buildMovableWorkflowStepContent';
import {
    buildPropertyWorkflowStepContent,
    resolvePropertyWorkflowPendingRowForStep,
} from '../../seizedPropertyWorkflow/buildPropertyWorkflowStepContent';
import { SeizureWorkflowPendingFallback } from '../../seizedMovableWorkflow/seizureWorkflowPendingFallback';
import { pendingFallbackTitle } from './seizedAssetWorkflowPanelStateTypes';
import type { SeizedAssetWorkflowFoundation } from './useSeizedAssetWorkflowFoundation';
import type { SeizedAssetWorkflowHandlers } from './useSeizedAssetWorkflowHandlers';

/** Pending-decision mirror + accordion step assembly. */
export function useSeizedAssetWorkflowSteps(
    f: SeizedAssetWorkflowFoundation,
    handlers: SeizedAssetWorkflowHandlers,
) {
    const {
        assetKind,
        decisions,
        decisionsReloadEpoch,
        appealPerspective,
        entityId,
        stepIdPrefix,
        actionShell,
        stepTitles,
        liveEntity,
        engine,
        dossierId,
        workflowNormStatus,
        liveActiveIdx,
        workflowDecisions,
        optimisticPendingBySubtype,
        optimisticObjectionDecisionId,
        submitSubtype,
        hasPendingSubtype,
        hasAnyPendingForStep,
        hasWithdrawablePending,
        proceedsDone,
        openTrustDisburseForProceeds,
        expertApprovedUnsaved,
        expertCommitteeApprovedUnsaved,
        auctionApprovedUnsaved,
        reauctionApprovedUnsaved,
        step2Lane,
        setStep2Lane,
        dismissedApprovedInlineForStep,
        setDismissedApprovedInlineForStep,
        inlineFocusKey,
        pendingDecisionId,
    } = f;

    const {
        renderInlineForStep,
        submitObjectionRequest,
        handleActiveStepBack,
        stepBackLabel,
        showStepBack,
    } = handlers;

    const renderStepPendingMirror = React.useCallback(
        (stepIndex: number, preferredSubtype?: string): React.ReactNode => {
            const row =
                assetKind === 'movable'
                    ? resolveMovableWorkflowPendingRowForStep(
                          workflowDecisions,
                          entityId,
                          stepIndex,
                          optimisticObjectionDecisionId,
                          preferredSubtype,
                          optimisticPendingBySubtype,
                      )
                    : resolvePropertyWorkflowPendingRowForStep(
                          workflowDecisions,
                          entityId,
                          stepIndex,
                          optimisticObjectionDecisionId,
                          preferredSubtype,
                          optimisticPendingBySubtype,
                      );
            if (!row) {
                const subtype = String(preferredSubtype || '').trim();
                if (subtype && hasPendingSubtype(subtype)) {
                    return (
                        <div className={actionShell}>
                            <SeizureWorkflowPendingFallback
                                title={pendingFallbackTitle(assetKind, subtype, 'optimistic')}
                            />
                        </div>
                    );
                }
                return null;
            }
            if (!engine.isValidDossier(dossierId)) {
                const subtype = String(preferredSubtype || '').trim();
                return (
                    <div className={actionShell}>
                        <SeizureWorkflowPendingFallback
                            title={pendingFallbackTitle(assetKind, subtype, 'invalidDossier')}
                        />
                    </div>
                );
            }
            return (
                <div className={actionShell}>
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
            assetKind,
            workflowDecisions,
            entityId,
            optimisticObjectionDecisionId,
            optimisticPendingBySubtype,
            dossierId,
            appealPerspective,
            decisionsReloadEpoch,
            hasPendingSubtype,
            engine,
            actionShell,
        ],
    );

    const stepContentDeps = React.useMemo(() => {
        const shared = {
            activeIdx: liveActiveIdx,
            decisions: workflowDecisions,
            normStatus: workflowNormStatus,
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
        };
        if (assetKind === 'movable') {
            return {
                ...shared,
                m: liveEntity as SeizedMovable,
                movableId: entityId,
            };
        }
        return {
            ...shared,
            p: liveEntity as SeizedProperty,
            propertyId: entityId,
        };
    }, [
        assetKind,
        liveActiveIdx,
        workflowDecisions,
        workflowNormStatus,
        liveEntity,
        entityId,
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
    ]);

    const contentForStepIndex = React.useCallback(
        (stepIndex: number) =>
            assetKind === 'movable'
                ? buildMovableWorkflowStepContent(stepContentDeps as never, stepIndex)
                : buildPropertyWorkflowStepContent(stepContentDeps as never, stepIndex),
        [assetKind, stepContentDeps],
    );

    const doneStepSubtitle = React.useCallback(
        (stepIndex: number): string => {
            const history = buildSeizureWorkflowStepHistory(
                stepIndex,
                liveEntity,
                decisions,
                engine.plugin,
                entityId,
            );
            if (!history.length) return 'اضغط لعرض التفاصيل';
            const first = history[0];
            const text = `${first.label}: ${first.value}`;
            return text.length > 52 ? `${text.slice(0, 49)}…` : text;
        },
        [liveEntity, decisions, entityId, engine.plugin, decisionsReloadEpoch],
    );

    const steps: ExecutionInlineStep[] = React.useMemo(() => {
        return stepTitles.map((title, idx) => {
            const st = stepStatusForIndex(idx, liveActiveIdx);
            const isActive = st === 'active';
            const pendingOnStep = isActive && hasWithdrawablePending;
            const content = contentForStepIndex(idx);
            return {
                id: `${stepIdPrefix}_${idx}`,
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
        stepTitles,
        stepIdPrefix,
        liveActiveIdx,
        contentForStepIndex,
        doneStepSubtitle,
        hasWithdrawablePending,
        showStepBack,
        handleActiveStepBack,
        stepBackLabel,
    ]);

    return { steps };
}
