import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import type { BreakInventoryFurnitureSavePayload } from '@/app/utils/executorApprovalWorkflow';
import {
    resolveBreakInventoryStorageId,
    runFinalizeBreakInventoryEntry,
    runSaveBreakInventoryLedgerEntry,
    runSaveMaritalFurnitureDeliveryInventoryEntry,
    type CaseNoteRow,
} from './executionDashboardBreakInventorySave';

export type UseExecutionDashboardBreakInventoryHandlersParams = {
    evictionProcedureLocked: boolean;
    decisionsStorageExecutionId: string | undefined;
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    showToast: (message: string, type?: string) => void;
    setCaseNotesLog: Dispatch<SetStateAction<CaseNoteRow[]>>;
    persistExecutionMergeRef: MutableRefObject<((patch: Record<string, unknown>) => void) | null>;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
};

export function useExecutionDashboardBreakInventoryHandlers({
    evictionProcedureLocked,
    decisionsStorageExecutionId,
    executionData,
    executionId,
    showToast,
    setCaseNotesLog,
    persistExecutionMergeRef,
    persistExecutionMerge,
}: UseExecutionDashboardBreakInventoryHandlersParams) {
    const storageDeps = useCallback(
        () => ({
            storageId: resolveBreakInventoryStorageId(
                decisionsStorageExecutionId,
                executionData,
                executionId,
            ),
            evictionProcedureLocked,
            showToast,
        }),
        [decisionsStorageExecutionId, evictionProcedureLocked, executionData, executionId, showToast],
    );

    const saveBreakInventoryLedgerEntry = useCallback(
        (input: { decisionId: string; payload: BreakInventoryFurnitureSavePayload }) => {
            runSaveBreakInventoryLedgerEntry(input, {
                ...storageDeps(),
                setCaseNotesLog,
                persistExecutionMergeRef,
            });
        },
        [persistExecutionMergeRef, setCaseNotesLog, storageDeps],
    );

    const finalizeBreakInventoryEntry = useCallback(
        (input: { decisionId: string }) => {
            runFinalizeBreakInventoryEntry(input, storageDeps());
        },
        [storageDeps],
    );

    const saveMaritalFurnitureDeliveryInventoryEntry = useCallback(
        (input: { decisionId: string; items: MaritalFurnitureItem[] }) => {
            runSaveMaritalFurnitureDeliveryInventoryEntry(input, {
                ...storageDeps(),
                persistExecutionMerge,
                setCaseNotesLog,
                persistExecutionMergeRef,
            });
        },
        [persistExecutionMerge, persistExecutionMergeRef, setCaseNotesLog, storageDeps],
    );

    return {
        saveBreakInventoryLedgerEntry,
        finalizeBreakInventoryEntry,
        saveMaritalFurnitureDeliveryInventoryEntry,
    };
}
