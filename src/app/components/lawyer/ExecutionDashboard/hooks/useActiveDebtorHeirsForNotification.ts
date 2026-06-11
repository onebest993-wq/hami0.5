import { useMemo } from 'react';
import type { Debtor, ExecutionFile } from '@/app/types/execution';
import { getPartyDeathCaseForRole } from '@/app/utils/partyDeathCaseScope';

export function useActiveDebtorHeirsForNotification(
    executionData: ExecutionFile | null | undefined,
    debtorBrowserTabsMode: boolean,
    activeWorkspaceDebtorForFollowup: { d: Debtor; isPrimary?: boolean; key?: string } | null,
): string[] {
    return useMemo(() => {
        const activeDebtorHeirsFromTabs =
            debtorBrowserTabsMode && activeWorkspaceDebtorForFollowup
                ? ((activeWorkspaceDebtorForFollowup.d as { heirs?: string[] } | undefined)?.heirs || [])
                : [];
        const fromPrimary = (executionData?.debtors?.[0]?.heirs || []).filter((s) => /\S/.test(String(s)));
        const debtorDeathCase = getPartyDeathCaseForRole(executionData, 'debtor');
        const fromDeathCase = (debtorDeathCase?.heir_names || []).filter((s) => /\S/.test(String(s)));
        const base =
            activeDebtorHeirsFromTabs.length > 0
                ? activeDebtorHeirsFromTabs
                : fromPrimary.length > 0
                  ? fromPrimary
                  : fromDeathCase;
        const seen = new Set<string>();
        return base
            .map((s) => String(s).trim())
            .filter(Boolean)
            .filter((name) => {
                if (seen.has(name)) return false;
                seen.add(name);
                return true;
            });
    }, [
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        executionData?.debtors,
        executionData?.debtor_party_death_case,
        executionData?.party_death_case,
    ]);
}
