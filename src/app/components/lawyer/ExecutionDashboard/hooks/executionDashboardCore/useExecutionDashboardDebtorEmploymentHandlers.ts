// @ts-nocheck
/** Phase C — تبديل صفة المدين (موظف ↔ كاسب) */
import { useCallback, type MutableRefObject, type Dispatch, type SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { DebtorWorkspaceEntry } from '../useDebtorWorkspaceEntries';
import { runDebtorEmploymentToggle } from './executionDashboardDebtorEmploymentToggle';

export type UseExecutionDashboardDebtorEmploymentHandlersParams = {
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    debtorWorkspaceEntries: DebtorWorkspaceEntry[];
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string) => void;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
};

export function useExecutionDashboardDebtorEmploymentHandlers({
    executionDataRef,
    debtorWorkspaceEntries,
    nextTimelineId,
    persistExecutionMerge,
    showToast,
    setTimelineEvents,
}: UseExecutionDashboardDebtorEmploymentHandlersParams) {
    const handleDebtorEmploymentToggle = useCallback(
        (ctx?: { debtorKey: string; isPrimary: boolean }) => {
            runDebtorEmploymentToggle({
                base: executionDataRef.current,
                debtorWorkspaceEntries,
                ctx,
                nextTimelineId,
                persistExecutionMerge,
                showToast,
                setTimelineEvents,
            });
        },
        [debtorWorkspaceEntries, executionDataRef, nextTimelineId, persistExecutionMerge, showToast, setTimelineEvents],
    );

    return { handleDebtorEmploymentToggle };
}
