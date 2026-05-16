import { useMemo } from 'react';
import type { Debtor, ExecutionFile } from '@/app/types/execution';
import type { UnifiedExecutionDebtorRow } from '../types';
import { executionDebtorRowCleared } from '../helpers';

export function useAllDebtorsUnified(
    effectiveDebtors: Debtor[],
    executionData: ExecutionFile | null | undefined,
): UnifiedExecutionDebtorRow[] {
    return useMemo((): UnifiedExecutionDebtorRow[] => {
        const rows: UnifiedExecutionDebtorRow[] = [];
        const addList = executionData?.party_multiplicity?.additionalDebtors ?? [];
        const primary = effectiveDebtors[0] as Debtor | undefined;
        if (primary) {
            const id =
                primary.id != null && String(primary.id).trim() !== ''
                    ? String(primary.id)
                    : 'primary_debtor';
            const name = String(primary.name || 'مدين').trim() || 'مدين';
            const allocRaw = Number(primary.allocated_debt);
            const paidRaw = Number(primary.paid_amount);
            const alloc = Number.isFinite(allocRaw) ? Math.max(0, allocRaw) : 0;
            const p = Number.isFinite(paidRaw) ? Math.max(0, paidRaw) : 0;
            rows.push({
                id,
                name,
                source: 'primary',
                allocated_debt: alloc,
                paid_amount: p,
                cleared: executionDebtorRowCleared(alloc, p),
            });
        }
        for (const ad of addList) {
            const alloc = Math.max(0, Number(ad.allocated_debt) || 0);
            const paid = Math.max(0, Number(ad.paid_amount) || 0);
            rows.push({
                id: String(ad.id ?? ''),
                name: String(ad.name || 'مدين').trim() || 'مدين',
                source: 'additional',
                allocated_debt: alloc,
                paid_amount: paid,
                cleared: executionDebtorRowCleared(alloc, paid, ad.status),
            });
        }
        return rows;
    }, [effectiveDebtors, executionData?.party_multiplicity]);
}
