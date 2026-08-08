import React from 'react';
import { dispatchDecisionsReload, getGoverningEvictionProcedureRowForBranch, isEvictionProcedureRowWorkflowComplete, isExecutorRowRejectedAndFinal, listEvictionProcedureHubRowsForBranch } from '@/app/utils/executorSeizureDecisionQueue';
import { summarizeExecutorHubRequestLifecycle } from '@/app/utils/executorRequestLifecycle';
import { useExecutorDecisions } from '@/app/components/lawyer/ExecutionDashboard/hooks/useExecutorDecisions';
import { readFollowupMergedExecutorDecisions, resolveMaritalFurnitureDeliveryState } from '@/app/utils/maritalFurnitureDeliveryWorkflow';
import { shouldShowSpecificDeliveryMovableValuationExpert, shouldShowSpecificDeliveryPropertyExpert } from '@/app/utils/specificDeliveryExpertVisibility';
import { getPendingSpecificDeliveryItems } from '@/app/utils/specificDeliveryItemsUtils';
import { appendEvictionProcedureRequest } from '@/app/utils/appendEvictionProcedureRequest';
import { dispatchOpenDecisionsModalFromFollowup } from '@/app/utils/openDecisionsModalFromFollowup';
import { resolveAllEvictionAppealSync } from '@/app/utils/evictionAppealSync';
import { resolveBreakInventoryWorkflowComplete } from '@/app/utils/evictionBranchSignals';
import type { EvictionAfterApproveDeps } from '../evictionProcedureAfterApprove';
import { EVICTION_PROCEDURE_RESUBMIT_WARNING } from './evictionProceduresConstants';
import type { EvictionProcedureExpandKey, EvictionProceduresSectionProps } from './evictionProceduresTypes';
import { renderEvictionProcedurePanel } from './renderEvictionProcedurePanel';

export function useEvictionProceduresSectionState(props: EvictionProceduresSectionProps) {
    const {
        executionCoerciveButtonDisabled,
        appendEvictionProcedure,
        appendEvictionExecutorRequest,
        decisionsStorageExecutionId,
        executionData = null,
        showToast,
        hideEncroachmentEvictionProcedureItems = false,
        showSpecificDeliveryBreakInventoryCard = false,
        showSpecificDeliverySurveyorCard = false,
        showSpecificDeliveryConversionCard = false,
        specificDeliveryItemNature = null,
        specificDeliveryItems = null,
        debtAmount = 0,
        totalAmount = 0,
        specificDeliveryConvertedAmount = 0,
        specificDeliveryFinancialized = false,
        savePoliceAssistance,
        saveBreakInventoryLedger,
        finalizeBreakInventoryRequest,
        isMaritalFurnitureClaim = false,
        maritalFurnitureItems = [],
        onOpenDecisionsModal,
        saveMaritalFurnitureDeliveryInventory,
        expandProcedureKey = null,
        onExpandProcedureConsumed,
        saveJudicialCustodianDetails,
    } = props;

    const { executionId, decisions } = useExecutorDecisions(decisionsStorageExecutionId, executionData);
    const [expandedByKey, setExpandedByKey] = React.useState<Partial<Record<EvictionProcedureExpandKey, boolean>>>({});
    const [fieldVisitDateDraft, setFieldVisitDateDraft] = React.useState('');

    const decisionRows = React.useMemo(
        () => (Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : []),
        [decisions],
    );

    const followupDecisionRows = React.useMemo(
        () =>
            readFollowupMergedExecutorDecisions(
                decisionsStorageExecutionId,
                executionData,
                decisionRows,
            ),
        [decisionsStorageExecutionId, executionData, decisionRows],
    );

    const showPropertyExpertCard = shouldShowSpecificDeliveryPropertyExpert({
        specificDeliveryItemNature,
        specificDeliveryItems,
        showPropertyExpertCardFlag: showSpecificDeliverySurveyorCard,
    });

    const showMovableValuationExpertCard = shouldShowSpecificDeliveryMovableValuationExpert({
        specificDeliveryItemNature,
        specificDeliveryItems,
        specificDeliveryFinancialized,
        debtAmount,
        totalAmount,
        specificDeliveryConvertedAmount,
        decisions: decisionRows,
    });

    const hasPendingDeliveryItems =
        getPendingSpecificDeliveryItems(specificDeliveryItems ?? []).length > 0 ||
        (!specificDeliveryItems?.length && !specificDeliveryFinancialized);

    const openAppeals = React.useCallback(
        (decisionId: string, decisionRow?: Record<string, unknown> | null) => {
            const row =
                decisionRow ??
                followupDecisionRows.find(
                    (r) => String(r.id || '').trim() === String(decisionId || '').trim(),
                ) ??
                null;
            const pending =
                !row?.id ||
                !String((row as { executorOutcome?: string }).executorOutcome ?? 'pending').trim() ||
                String((row as { executorOutcome?: string }).executorOutcome).trim() === 'pending';
            const tab = pending ? ('current' as const) : ('previous' as const);

            if (typeof onOpenDecisionsModal === 'function') {
                onOpenDecisionsModal({ tab, decisionId });
                return;
            }

            dispatchOpenDecisionsModalFromFollowup({
                storageExecutionId: decisionsStorageExecutionId || executionId,
                decisionId,
                decisionRow: row,
                executionData,
                tab,
            });
        },
        [
            decisionsStorageExecutionId,
            executionId,
            executionData,
            followupDecisionRows,
            onOpenDecisionsModal,
        ],
    );

    const appealSync = React.useMemo(
        () =>
            resolveAllEvictionAppealSync({
                executionId: executionId || decisionsStorageExecutionId,
                allDecisions: decisionRows,
            }),
        [decisionRows, executionId, decisionsStorageExecutionId],
    );

    const breakInventoryWorkflowComplete = React.useMemo(
        () =>
            resolveBreakInventoryWorkflowComplete(
                decisionRows,
                Boolean(appealSync['Lock Breaking & Inventory']?.workflowComplete),
            ),
        [appealSync, decisionRows],
    );

    const showCustodianProcedure =
        !props.hideEvictionCustodianProcedure && breakInventoryWorkflowComplete;

    const appendEvictionProcedureSafe = React.useCallback(
        (input: Parameters<typeof appendEvictionProcedure>[0]): boolean =>
            appendEvictionProcedureRequest(
                {
                    locked: executionCoerciveButtonDisabled,
                    decisionsStorageExecutionId: executionId || decisionsStorageExecutionId,
                    executionData,
                    appendEvictionExecutorRequest: (request) =>
                        appendEvictionExecutorRequest({
                            ...request,
                            executionData: request.executionData ?? executionData,
                        }),
                    showToast,
                },
                input,
            ),
        [
            executionCoerciveButtonDisabled,
            executionId,
            decisionsStorageExecutionId,
            executionData,
            appendEvictionExecutorRequest,
            showToast,
        ],
    );

    const fieldVisitRow = getGoverningEvictionProcedureRowForBranch(decisionRows, 'Field Visit Date');
    const policeRow = getGoverningEvictionProcedureRowForBranch(decisionRows, 'Police Assistance Request');
    const breakInventoryRow = getGoverningEvictionProcedureRowForBranch(
        decisionRows,
        'Lock Breaking & Inventory',
    );
    const maritalDeliveryState = isMaritalFurnitureClaim
        ? resolveMaritalFurnitureDeliveryState(followupDecisionRows)
        : {
              mode: 'none' as const,
              unifiedRow: null,
              fieldVisitRow: null,
              breakInventoryRow: null,
          };
    const custodianRow = getGoverningEvictionProcedureRowForBranch(decisionRows, 'Judicial Custodian');
    const forcedEvictionRow = getGoverningEvictionProcedureRowForBranch(decisionRows, 'Eviction');

    const toggleExpanded = React.useCallback((key: EvictionProcedureExpandKey) => {
        setExpandedByKey((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const procedureWasActiveRef = React.useRef<Partial<Record<EvictionProcedureExpandKey, boolean>>>({});

    React.useEffect(() => {
        if (!expandProcedureKey) return;
        const key =
            isMaritalFurnitureClaim &&
            (expandProcedureKey === 'field_visit' || expandProcedureKey === 'break_inventory')
                ? 'marital_furniture_delivery'
                : expandProcedureKey;
        setExpandedByKey((prev) => ({ ...prev, [key]: true }));
        procedureWasActiveRef.current[key] = true;
        onExpandProcedureConsumed?.();
    }, [expandProcedureKey, onExpandProcedureConsumed, isMaritalFurnitureClaim]);

    const maritalUnifiedId = String(maritalDeliveryState.unifiedRow?.id || '').trim();
    const maritalFvId = String(
        (maritalDeliveryState.fieldVisitRow ?? fieldVisitRow)?.id || '',
    ).trim();
    const maritalBiId = String(
        (maritalDeliveryState.breakInventoryRow ?? breakInventoryRow)?.id || '',
    ).trim();

    React.useEffect(() => {
        const maritalInProgress: boolean = isMaritalFurnitureClaim
            ? (() => {
                  const { mode, unifiedRow, fieldVisitRow: fv, breakInventoryRow: bi } =
                      maritalDeliveryState;
                  return Boolean(
                      (mode === 'unified' &&
                          unifiedRow?.id &&
                          !isEvictionProcedureRowWorkflowComplete(unifiedRow)) ||
                          (mode === 'legacy' &&
                              ((fv?.id && !isEvictionProcedureRowWorkflowComplete(fv)) ||
                                  (bi?.id && !isEvictionProcedureRowWorkflowComplete(bi)))),
                  );
              })()
            : false;

        const activeByKey: Partial<Record<EvictionProcedureExpandKey, boolean>> = {
            marital_furniture_delivery: maritalInProgress,
            field_visit:
                !isMaritalFurnitureClaim &&
                Boolean(
                    fieldVisitRow?.id && !isEvictionProcedureRowWorkflowComplete(fieldVisitRow),
                ),
            police: Boolean(
                policeRow?.id && !isEvictionProcedureRowWorkflowComplete(policeRow),
            ),
            break_inventory:
                !isMaritalFurnitureClaim &&
                Boolean(
                    breakInventoryRow?.id &&
                        !isEvictionProcedureRowWorkflowComplete(breakInventoryRow),
                ),
            custodian: Boolean(
                custodianRow?.id && !isEvictionProcedureRowWorkflowComplete(custodianRow),
            ),
            forced_eviction: Boolean(
                forcedEvictionRow?.id && !isEvictionProcedureRowWorkflowComplete(forcedEvictionRow),
            ),
        };

        setExpandedByKey((prev) => {
            let changed = false;
            const next = { ...prev };
            for (const [rawKey, active] of Object.entries(activeByKey)) {
                const key = rawKey as EvictionProcedureExpandKey;
                const wasActive = Boolean(procedureWasActiveRef.current[key]);
                procedureWasActiveRef.current[key] = Boolean(active);
                if (active && !wasActive) {
                    if (!next[key]) {
                        next[key] = true;
                        changed = true;
                    }
                }
            }
            return changed ? next : prev;
        });
    }, [
        isMaritalFurnitureClaim,
        maritalUnifiedId,
        maritalFvId,
        maritalBiId,
        fieldVisitRow?.id,
        policeRow?.id,
        breakInventoryRow?.id,
        custodianRow?.id,
        forcedEvictionRow?.id,
        maritalDeliveryState.mode,
    ]);

    const existingJudicialCustodians = React.useMemo(() => {
        const data = executionData as {
            eviction_judicial_custodians?: Array<{ fullName?: string; salary?: string }>;
            eviction_judicial_custodian?: { fullName?: string; salary?: string } | null;
        } | null;
        const arr = Array.isArray(data?.eviction_judicial_custodians)
            ? data!.eviction_judicial_custodians!
            : [];
        const list = arr
            .filter((c) => String(c?.fullName || '').trim())
            .map((c) => ({
                fullName: String(c.fullName || '').trim(),
                salary: String(c.salary || '').trim(),
                decisionId: String((c as { decisionId?: string }).decisionId || '').trim(),
            }));
        const legacy = data?.eviction_judicial_custodian;
        if (legacy?.fullName && !list.length) {
            list.push({
                fullName: String(legacy.fullName).trim(),
                salary: String(legacy.salary || '').trim(),
                decisionId: String((legacy as { decisionId?: string }).decisionId || '').trim(),
            });
        }
        return list;
    }, [executionData]);

    const afterApproveDeps = React.useMemo(
        (): EvictionAfterApproveDeps => ({
            decisionsStorageExecutionId: executionId || decisionsStorageExecutionId,
            decisionRows,
            fieldVisitDateDraft,
            setFieldVisitDateDraft,
            showToast: (message, type = 'info') => showToast(message, type),
            dispatchDecisionsReload,
            executionCoerciveButtonDisabled,
            savePoliceAssistance,
            isMaritalFurnitureClaim,
            maritalFurnitureItems,
            saveMaritalFurnitureDeliveryInventory,
            saveBreakInventoryLedger,
            finalizeBreakInventoryRequest,
            saveJudicialCustodianDetails,
            existingJudicialCustodians,
        }),
        [
            executionId,
            decisionsStorageExecutionId,
            decisionRows,
            fieldVisitDateDraft,
            showToast,
            executionCoerciveButtonDisabled,
            savePoliceAssistance,
            isMaritalFurnitureClaim,
            maritalFurnitureItems,
            saveMaritalFurnitureDeliveryInventory,
            saveBreakInventoryLedger,
            finalizeBreakInventoryRequest,
            saveJudicialCustodianDetails,
            existingJudicialCustodians,
        ],
    );

    const renderProcedurePanel = React.useCallback(
        (label: string, row: Record<string, unknown> | null, branch: string) =>
            renderEvictionProcedurePanel({
                label,
                row,
                branch,
                executionId,
                decisionRows,
                afterApproveDeps,
                openAppeals,
            }),
        [executionId, decisionRows, afterApproveDeps, openAppeals],
    );

    const showBreakInventory =
        !hideEncroachmentEvictionProcedureItems || showSpecificDeliveryBreakInventoryCard;

    const isRowWorkflowComplete = React.useCallback(
        (row: Record<string, unknown> | null | undefined) =>
            Boolean(
                row?.id &&
                    isEvictionProcedureRowWorkflowComplete(row) &&
                    !isExecutorRowRejectedAndFinal(row),
            ),
        [],
    );

    const procedureCardInProgress = React.useCallback(
        (row: Record<string, unknown> | null | undefined) =>
            Boolean(row?.id && !isRowWorkflowComplete(row)),
        [isRowWorkflowComplete],
    );

    const lifecycleForBranch = React.useCallback(
        (branch: string) =>
            summarizeExecutorHubRequestLifecycle(
                listEvictionProcedureHubRowsForBranch(decisionRows, branch),
            ),
        [decisionRows],
    );

    return {
        ...props,
        executionId,
        expandedByKey,
        toggleExpanded,
        showPropertyExpertCard,
        showMovableValuationExpertCard,
        showSpecificDeliveryConversionCard,
        hasPendingDeliveryItems,
        appendEvictionProcedureSafe,
        fieldVisitRow,
        policeRow,
        breakInventoryRow,
        custodianRow,
        forcedEvictionRow,
        renderProcedurePanel,
        showBreakInventory,
        isRowWorkflowComplete,
        procedureCardInProgress,
        lifecycleForBranch,
        resubmitWarning: EVICTION_PROCEDURE_RESUBMIT_WARNING,
        showCustodianProcedure,
    };
}

export type EvictionProceduresSectionState = ReturnType<typeof useEvictionProceduresSectionState>;
