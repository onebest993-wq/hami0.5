import React from 'react';
import { mergeSeizureLiveEntity } from '@/app/domain/seizure/mergeSeizureLiveEntity';
import { useSeizureInlineLiveTick } from '@/app/domain/seizure/useSeizureInlineLiveTick';
import { useSeizureAssetWorkflowPanelCore } from '@/app/domain/seizure/useSeizureAssetWorkflowPanelCore';
import { findApprovedUnsavedSeizureDecision } from '@/app/domain/seizure/seizureWorkflowDecisionQueries';
import {
    readSeizureWorkflowLaneSession,
    writeSeizureWorkflowLaneSession,
} from '@/app/domain/seizure/seizureWorkflowLaneSession';
import {
    MOVABLE_WORKFLOW_ACTION_SHELL,
    MOVABLE_WORKFLOW_STEP_TITLES,
} from '../../seizedMovableWorkflow/seizedMovableWorkflowConstants';
import {
    PROPERTY_WORKFLOW_ACTION_SHELL,
    PROPERTY_WORKFLOW_STEP_TITLES,
} from '../../seizedPropertyWorkflow/seizedPropertyWorkflowConstants';
import {
    MOVABLE_LIVE_TICK_EVENTS,
    PROPERTY_LIVE_TICK_EVENTS,
    type UseSeizedAssetWorkflowPanelStateInput,
    type WorkflowStep2Lane,
    type WorkflowStepNavRequest,
} from './seizedAssetWorkflowPanelStateTypes';

/** Live entity, core engine, approved-unsaved flags, and lane/nav local state. */
export function useSeizedAssetWorkflowFoundation(input: UseSeizedAssetWorkflowPanelStateInput) {
    const {
        assetKind,
        workflowStatus: status,
        decisionsStorageExecutionId,
        executionId,
        executionDataId,
        executionData,
        decisions,
        showToast,
        decisionsReloadEpoch = 0,
        appealPerspective = 'creditor_agent',
    } = input;

    const entity = assetKind === 'movable' ? input.movable : input.property;
    const entities = assetKind === 'movable' ? input.movables : input.properties;

    const entityId = String(entity.id || '').trim();
    const stepIdPrefix = assetKind === 'movable' ? 'movable_step' : 'property_step';
    const actionShell =
        assetKind === 'movable' ? MOVABLE_WORKFLOW_ACTION_SHELL : PROPERTY_WORKFLOW_ACTION_SHELL;
    const stepTitles =
        assetKind === 'movable' ? MOVABLE_WORKFLOW_STEP_TITLES : PROPERTY_WORKFLOW_STEP_TITLES;
    const disburseKey =
        assetKind === 'movable' ? ('seizedMovableId' as const) : ('seizedPropertyId' as const);

    const liveTickEvents =
        assetKind === 'movable' ? MOVABLE_LIVE_TICK_EVENTS : PROPERTY_LIVE_TICK_EVENTS;
    const liveTickDetailKey = assetKind === 'movable' ? 'movableId' : 'propertyId';

    const inlineLiveTick = useSeizureInlineLiveTick(
        entityId,
        liveTickEvents,
        liveTickDetailKey,
    );

    const readEntitiesFromCtx =
        assetKind === 'movable'
            ? input.movableInlineSaveCtx.readMovables
            : input.propertyInlineSaveCtx.readProperties;

    const liveEntity = React.useMemo(() => {
        const fromList = entities.find((row) => String(row.id || '').trim() === entityId);
        const fromCtx = readEntitiesFromCtx?.().find(
            (row) => String(row.id || '').trim() === entityId,
        );
        return mergeSeizureLiveEntity(entity, fromList, fromCtx);
    }, [entity, entities, entityId, readEntitiesFromCtx, inlineLiveTick]);

    const core = useSeizureAssetWorkflowPanelCore({
        assetKind,
        entity: liveEntity,
        entityId,
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
        ...(assetKind === 'property'
            ? { inlineUpdatedEventNames: ['hami-seized-property-inline-updated'] }
            : {}),
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

    const proceedsDone = Boolean(String(liveEntity.proceedsDisburseCompletedAtIso || '').trim());

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
                        [disburseKey]: entityId,
                    },
                }),
            );
        } catch {
            /* ignore */
        }
    }, [engine, dossierId, disburseKey, entityId, showToast]);

    const expertApprovedUnsaved = React.useMemo(
        () =>
            findApprovedUnsavedSeizureDecision(
                decisions,
                engine.plugin,
                engine.plugin.expertSubtype,
                entityId,
            ),
        [decisions, entityId, decisionsReloadEpoch, engine.plugin],
    );

    const expertCommitteeApprovedUnsaved = React.useMemo(
        () =>
            findApprovedUnsavedSeizureDecision(
                decisions,
                engine.plugin,
                engine.plugin.expertCommitteeSubtype,
                entityId,
            ),
        [decisions, entityId, decisionsReloadEpoch, engine.plugin],
    );

    const auctionApprovedUnsaved = React.useMemo(
        () =>
            findApprovedUnsavedSeizureDecision(
                decisions,
                engine.plugin,
                engine.plugin.auctionSubtype,
                entityId,
            ),
        [decisions, entityId, decisionsReloadEpoch, engine.plugin],
    );

    const reauctionApprovedUnsaved = React.useMemo(
        () =>
            findApprovedUnsavedSeizureDecision(
                decisions,
                engine.plugin,
                engine.plugin.reauctionDefaultSubtype,
                entityId,
            ),
        [decisions, entityId, decisionsReloadEpoch, engine.plugin],
    );

    const laneSessionKey = `${assetKind}:${entityId}`;
    const [step2Lane, setStep2LaneRaw] = React.useState<WorkflowStep2Lane | null>(() =>
        readSeizureWorkflowLaneSession(laneSessionKey),
    );
    const setStep2Lane = React.useCallback(
        (value: React.SetStateAction<WorkflowStep2Lane | null>) => {
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
    const [stepNavRequest, setStepNavRequest] = React.useState<WorkflowStepNavRequest | null>(
        null,
    );

    return {
        input,
        assetKind,
        decisions,
        showToast,
        decisionsReloadEpoch,
        appealPerspective,
        entities,
        entityId,
        stepIdPrefix,
        actionShell,
        stepTitles,
        inlineLiveTick,
        liveEntity,
        engine,
        dossierId,
        workflowNormStatus,
        liveActiveIdx,
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
        inlineRemountKey,
        setInlineRemountKey,
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
        stepNavRequest,
        setStepNavRequest,
    };
}

export type SeizedAssetWorkflowFoundation = ReturnType<typeof useSeizedAssetWorkflowFoundation>;
