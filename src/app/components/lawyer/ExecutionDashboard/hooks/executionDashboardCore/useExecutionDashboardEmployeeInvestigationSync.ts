// @ts-nocheck
/** مزامنة مفاتحة التحقيق → تكليف حضور الموظف */
import { useEffect, useRef } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';
import {
    buildEmployeeInvestigationSyncSignature,
    computeEmployeeInvestigationMerge,
    investigationMergeToastMessage,
    type ExecutorDecisionRowLite,
} from './executionDashboardEmployeeAssignmentSync';

export type UseExecutionDashboardEmployeeInvestigationSyncParams = {
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    decisionsReloadEpoch: number;
    primaryDebtorKeyResolved: string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
};

export function useExecutionDashboardEmployeeInvestigationSync({
    executionData,
    executionId,
    decisionsReloadEpoch,
    primaryDebtorKeyResolved,
    persistExecutionMerge,
    showToast,
}: UseExecutionDashboardEmployeeInvestigationSyncParams) {
    const syncSigRef = useRef<string>('');

    useEffect(() => {
        syncSigRef.current = '';
    }, [executionData?.id]);

    useEffect(() => {
        const d = executionData;
        const exId = d?.id ?? executionId;
        if (!d || !exId) return;

        const rows = readExecutorDecisionsArray(exId) as ExecutorDecisionRowLite[];
        const merged = computeEmployeeInvestigationMerge(d, primaryDebtorKeyResolved, rows);
        if (!merged) return;

        const syncSig = buildEmployeeInvestigationSyncSignature(String(d.id), merged);
        if (syncSigRef.current === syncSig) return;
        syncSigRef.current = syncSig;

        persistExecutionMerge(merged.patch);
        const toast = investigationMergeToastMessage(merged.approvedCount, merged.rejectedCount);
        showToast(toast.message, toast.type, toast.options);
    }, [
        decisionsReloadEpoch,
        executionData,
        executionData?.employee_summons_assignment,
        executionData?.employee_summons_assignments_by_debtor,
        executionId,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        showToast,
    ]);
}
