/** Phase C Slice 16 — حذف سجل حارس قضائي من الإضبارة */
import { useCallback } from 'react';
import type { ExecutionFile } from '@/app/types/execution';

export type UseExecutionDashboardJudicialCustodianRemoveParams = {
    executionData: ExecutionFile | null | undefined;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string) => void;
};

export function useExecutionDashboardJudicialCustodianRemove(
    params: UseExecutionDashboardJudicialCustodianRemoveParams,
) {
    const { executionData, persistExecutionMerge, showToast } = params;

    return useCallback(
        (recordId: string) => {
            const d = executionData;
            if (!d) return;
            const prevArr = Array.isArray(d.eviction_judicial_custodians)
                ? [...d.eviction_judicial_custodians]
                : [];
            const leg = d.eviction_judicial_custodian;
            let list = prevArr;
            if (!list.length && leg?.fullName?.trim() && leg.savedAt) {
                list = [
                    {
                        id: 'legacy_custodian',
                        fullName: leg.fullName,
                        salary: leg.salary,
                        decisionId: leg.decisionId,
                        savedAt: leg.savedAt,
                    },
                ];
            }
            const next = list.filter((c) => String(c.id) !== String(recordId));
            persistExecutionMerge({
                eviction_judicial_custodians: next,
                eviction_judicial_custodian: null,
            });
            showToast('تم حذف بيانات الحارس', 'info');
        },
        [executionData, persistExecutionMerge, showToast],
    );
}
