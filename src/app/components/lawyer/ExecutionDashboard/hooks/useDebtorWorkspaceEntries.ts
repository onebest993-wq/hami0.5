import { useMemo } from 'react';
import type { Debtor } from '@/app/types/execution';
import { resolvePartyStoredName } from '@/app/utils/executionPartyNormalize';
import type { AdditionalExecutionDebtor } from '@/app/types/execution';
import { isDebtorRowEmployee } from '@/app/stores';
import type { UnifiedExecutionDebtorRow } from '../types';

export type DebtorWorkspaceEntry = {
    key: string;
    unified: UnifiedExecutionDebtorRow;
    d: Debtor;
    isPrimary: boolean;
    fileDebtorIndex: number | null;
};

export function useDebtorWorkspaceEntries(
    effectiveDebtors: Debtor[],
    additionalDebtors: AdditionalExecutionDebtor[] | undefined,
    allDebtorsUnified: UnifiedExecutionDebtorRow[],
): DebtorWorkspaceEntry[] {
    return useMemo((): DebtorWorkspaceEntry[] => {
        const out: DebtorWorkspaceEntry[] = [];
        const prim = effectiveDebtors[0] as Debtor | undefined;
        if (prim && allDebtorsUnified[0]) {
            out.push({
                key:
                    prim.id != null && String(prim.id).trim() !== ''
                        ? String(prim.id)
                        : 'primary_debtor',
                unified: allDebtorsUnified[0],
                d: prim,
                isPrimary: true,
                fileDebtorIndex: 0,
            });
        }
        const adds = additionalDebtors ?? [];
        for (let i = 0; i < adds.length; i++) {
            const ad = adds[i];
            const u = allDebtorsUnified[i + 1];
            if (!u) continue;
            const d = {
                id: ad.id,
                type: 'debtor' as const,
                name: resolvePartyStoredName(ad),
                phone: ad.phone,
                address: ad.address,
                notificationDate: null as string | null,
                isClient: false,
                occupation: isDebtorRowEmployee(ad) ? 'موظف' : 'كاسب',
            } as Debtor;
            out.push({
                key: String(ad.id ?? `additional-debtor-${i}`),
                unified: u,
                d,
                isPrimary: false,
                fileDebtorIndex: null,
            });
        }
        return out;
    }, [effectiveDebtors, additionalDebtors, allDebtorsUnified]);
}
