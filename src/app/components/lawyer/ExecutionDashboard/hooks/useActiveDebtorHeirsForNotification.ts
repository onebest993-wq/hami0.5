import { useMemo } from 'react';
import type { Debtor, ExecutionFile } from '@/app/types/execution';

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
        const fromDeathCase =
            executionData?.party_death_case?.deceased_party === 'debtor'
                ? (executionData?.party_death_case?.heir_names || []).filter((s) => /\S/.test(String(s)))
                : [];
        const fromDossier = (executionData?.dossier_heirs_list || []).filter((s) => /\S/.test(String(s)));
        const base =
            activeDebtorHeirsFromTabs.length > 0
                ? activeDebtorHeirsFromTabs
                : fromPrimary.length > 0
                  ? fromPrimary
                  : fromDeathCase.length > 0
                    ? fromDeathCase
                    : fromDossier;
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
        executionData?.party_death_case,
        executionData?.dossier_heirs_list,
    ]);
}
