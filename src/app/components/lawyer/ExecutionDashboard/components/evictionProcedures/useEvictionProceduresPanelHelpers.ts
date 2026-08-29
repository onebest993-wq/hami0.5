import React from 'react';
import type { EvictionAfterApproveDeps } from '../evictionProcedureAfterApprove';
import { dispatchDecisionsReload } from '@/app/utils/executorSeizureDecisionQueue';
import {
    isEvictionProcedureRowWorkflowComplete,
    isExecutorRowRejectedAndFinal,
    listEvictionProcedureHubRowsForBranch,
} from '@/app/utils/executorSeizureDecisionQueue';
import { summarizeExecutorHubRequestLifecycle } from '@/app/utils/executorRequestLifecycle';
import { renderEvictionProcedurePanel } from './renderEvictionProcedurePanel';
import type { ExecutionFile } from '@/app/types/execution';

export function useEvictionProceduresPanelHelpers(input: {
    executionData: ExecutionFile | null | undefined;
    executionId: string;
    decisionsStorageExecutionId: string;
    decisionRows: Record<string, unknown>[];
    fieldVisitDateDraft: string;
    setFieldVisitDateDraft: (v: string) => void;
    showToast: (message: string, type?: string) => void;
    executionCoerciveButtonDisabled: boolean;
    savePoliceAssistance: EvictionAfterApproveDeps['savePoliceAssistance'];
    isMaritalFurnitureClaim: boolean;
    maritalFurnitureItems: EvictionAfterApproveDeps['maritalFurnitureItems'];
    saveMaritalFurnitureDeliveryInventory: EvictionAfterApproveDeps['saveMaritalFurnitureDeliveryInventory'];
    saveBreakInventoryLedger: EvictionAfterApproveDeps['saveBreakInventoryLedger'];
    finalizeBreakInventoryRequest: EvictionAfterApproveDeps['finalizeBreakInventoryRequest'];
    saveJudicialCustodianDetails: EvictionAfterApproveDeps['saveJudicialCustodianDetails'];
    openAppeals: (decisionId: string) => void;
    hideEncroachmentEvictionProcedureItems: boolean;
    showSpecificDeliveryBreakInventoryCard: boolean;
}) {
    const existingJudicialCustodians = React.useMemo(() => {
        const data = input.executionData as {
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
    }, [input.executionData]);

    const afterApproveDeps = React.useMemo(
        (): EvictionAfterApproveDeps => ({
            decisionsStorageExecutionId: input.executionId || input.decisionsStorageExecutionId,
            decisionRows: input.decisionRows,
            fieldVisitDateDraft: input.fieldVisitDateDraft,
            setFieldVisitDateDraft: input.setFieldVisitDateDraft,
            showToast: (message, type = 'info') => input.showToast(message, type),
            dispatchDecisionsReload,
            executionCoerciveButtonDisabled: input.executionCoerciveButtonDisabled,
            savePoliceAssistance: input.savePoliceAssistance,
            isMaritalFurnitureClaim: input.isMaritalFurnitureClaim,
            maritalFurnitureItems: input.maritalFurnitureItems,
            saveMaritalFurnitureDeliveryInventory: input.saveMaritalFurnitureDeliveryInventory,
            saveBreakInventoryLedger: input.saveBreakInventoryLedger,
            finalizeBreakInventoryRequest: input.finalizeBreakInventoryRequest,
            saveJudicialCustodianDetails: input.saveJudicialCustodianDetails,
            existingJudicialCustodians,
        }),
        [
            input.executionId,
            input.decisionsStorageExecutionId,
            input.decisionRows,
            input.fieldVisitDateDraft,
            input.setFieldVisitDateDraft,
            input.showToast,
            input.executionCoerciveButtonDisabled,
            input.savePoliceAssistance,
            input.isMaritalFurnitureClaim,
            input.maritalFurnitureItems,
            input.saveMaritalFurnitureDeliveryInventory,
            input.saveBreakInventoryLedger,
            input.finalizeBreakInventoryRequest,
            input.saveJudicialCustodianDetails,
            existingJudicialCustodians,
        ],
    );

    const renderProcedurePanel = React.useCallback(
        (label: string, row: Record<string, unknown> | null, branch: string) =>
            renderEvictionProcedurePanel({
                label,
                row,
                branch,
                executionId: input.executionId,
                decisionRows: input.decisionRows,
                afterApproveDeps,
                openAppeals: input.openAppeals,
            }),
        [input.executionId, input.decisionRows, afterApproveDeps, input.openAppeals],
    );

    const showBreakInventory =
        !input.hideEncroachmentEvictionProcedureItems || input.showSpecificDeliveryBreakInventoryCard;

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
                listEvictionProcedureHubRowsForBranch(input.decisionRows, branch),
            ),
        [input.decisionRows],
    );

    return {
        renderProcedurePanel,
        showBreakInventory,
        isRowWorkflowComplete,
        procedureCardInProgress,
        lifecycleForBranch,
    };
}
