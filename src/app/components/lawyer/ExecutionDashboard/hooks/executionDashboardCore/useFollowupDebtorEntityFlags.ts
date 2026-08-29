import { useMemo } from 'react';
import type { Debtor, ExecutionFile } from '@/app/types/execution';
import type { DebtorEntityKind } from '@/app/utils/debtorEntityKindUtils';
import { isLegalEntityDebtorKind, resolveDebtorEntityKind } from '@/app/utils/debtorEntityKindUtils';
import { isLawyerRepresentingDebtor } from '@/app/utils/debtorAgentRepresentationUtils';

type WorkspaceDebtor = {
    key: string;
    isPrimary: boolean;
    d: Debtor | Record<string, unknown>;
};

export function useFollowupDebtorEntityFlags(p: {
    executionData: ExecutionFile | null | undefined;
    executionId: string;
    activeDebtorIsEmployee: boolean;
    debtorBrowserTabsMode: boolean;
    activeWorkspaceDebtorForFollowup: WorkspaceDebtor | null | undefined;
    assignmentWorkspaceCtx: { activeDebtorKey?: string | null };
    primaryDebtorWorkspaceKey: string | null | undefined;
}) {
    const kasabTerminationEmphasis = !p.activeDebtorIsEmployee;

    const activeFollowupDebtorKeyForEntity = String(
        p.assignmentWorkspaceCtx.activeDebtorKey ?? p.primaryDebtorWorkspaceKey ?? p.executionId ?? '',
    );
    const activeDebtorEntityKind = useMemo((): DebtorEntityKind => {
        const prim = p.executionData?.debtors?.[0] as Debtor | undefined;
        let debtor: Debtor | Record<string, unknown> | undefined = prim;
        if (p.debtorBrowserTabsMode && p.activeWorkspaceDebtorForFollowup) {
            if (!p.activeWorkspaceDebtorForFollowup.isPrimary) {
                const ad = p.executionData?.party_multiplicity?.additionalDebtors?.find(
                    (a) => String(a.id) === p.activeWorkspaceDebtorForFollowup!.key,
                );
                debtor = (ad ?? p.activeWorkspaceDebtorForFollowup.d) as Debtor | Record<string, unknown>;
            } else {
                debtor = prim ?? p.activeWorkspaceDebtorForFollowup.d;
            }
        }
        return resolveDebtorEntityKind({
            executionData: p.executionData,
            debtor,
            debtorKey: activeFollowupDebtorKeyForEntity,
        });
    }, [
        p.executionData,
        p.debtorBrowserTabsMode,
        p.activeWorkspaceDebtorForFollowup,
        activeFollowupDebtorKeyForEntity,
    ]);

    const activeDebtorIsLegalEntity = isLegalEntityDebtorKind(activeDebtorEntityKind);
    const isRepresentingDebtor = useMemo(
        () => isLawyerRepresentingDebtor(p.executionData),
        [p.executionData],
    );
    const appealPerspective = isRepresentingDebtor ? 'debtor_agent' : 'creditor_agent';
    const hideCoerciveTabsForDebtorAgent = isRepresentingDebtor && !activeDebtorIsLegalEntity;

    return {
        kasabTerminationEmphasis,
        activeFollowupDebtorKeyForEntity,
        activeDebtorEntityKind,
        activeDebtorIsLegalEntity,
        isRepresentingDebtor,
        appealPerspective,
        hideCoerciveTabsForDebtorAgent,
    };
}
