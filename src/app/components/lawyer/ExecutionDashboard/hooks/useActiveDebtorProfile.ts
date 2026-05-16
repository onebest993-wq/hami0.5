import { useMemo } from 'react';
import type { Debtor, ExecutionFile } from '@/app/types/execution';
import { isDebtorRowEmployee } from '@/app/stores';

export function useActiveDebtorProfile(
    executionData: ExecutionFile | null | undefined,
    debtorBrowserTabsMode: boolean,
    activeWorkspaceDebtorForFollowup: { d: Debtor; isPrimary?: boolean; key?: string } | null,
    effectiveDebtors: Debtor[],
) {
    const activeDebtorIsEmployee = useMemo(() => {
        const d0 = effectiveDebtors[0] as Debtor | undefined;
        if (!executionData) {
            return isDebtorRowEmployee(d0);
        }
        if (debtorBrowserTabsMode && activeWorkspaceDebtorForFollowup) {
            if (activeWorkspaceDebtorForFollowup.isPrimary) {
                return isDebtorRowEmployee((executionData.debtors?.[0] as Debtor | undefined) ?? d0);
            }
            const ad = executionData.party_multiplicity?.additionalDebtors?.find(
                (a) => String(a.id) === activeWorkspaceDebtorForFollowup.key
            );
            if (ad) return ad.isEmployee !== false;
            return isDebtorRowEmployee(activeWorkspaceDebtorForFollowup.d as Debtor);
        }
        return isDebtorRowEmployee((executionData.debtors?.[0] as Debtor | undefined) ?? d0);
    }, [
        executionData,
        executionData?.debtors,
        executionData?.party_multiplicity?.additionalDebtors,
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        effectiveDebtors,
    ]);

    const activeDebtorIsDeceased = useMemo(() => {
        const d0 = effectiveDebtors[0] as (Debtor & { isDeceased?: boolean }) | undefined;
        if (!executionData) {
            return Boolean(d0?.isDeceased);
        }
        if (debtorBrowserTabsMode && activeWorkspaceDebtorForFollowup) {
            if (activeWorkspaceDebtorForFollowup.isPrimary) {
                const p = (executionData.debtors?.[0] as (Debtor & { isDeceased?: boolean }) | undefined) ?? d0;
                return Boolean(p?.isDeceased || executionData?.is_debtor_deceased);
            }
            const ad = executionData.party_multiplicity?.additionalDebtors?.find(
                (a) => String(a.id) === activeWorkspaceDebtorForFollowup.key
            ) as unknown as ({ isDeceased?: boolean } & Record<string, unknown>) | undefined;
            if (ad) return Boolean(ad.isDeceased);
            return Boolean((activeWorkspaceDebtorForFollowup.d as { isDeceased?: boolean } | undefined)?.isDeceased);
        }
        const p = (executionData.debtors?.[0] as (Debtor & { isDeceased?: boolean }) | undefined) ?? d0;
        return Boolean(p?.isDeceased || executionData?.is_debtor_deceased);
    }, [
        executionData,
        executionData?.debtors,
        executionData?.is_debtor_deceased,
        executionData?.party_multiplicity?.additionalDebtors,
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        effectiveDebtors,
    ]);

    return { activeDebtorIsEmployee, activeDebtorIsDeceased };
}
