import { useMemo } from 'react';
import type { Debtor, ExecutionFile } from '@/app/types/execution';
import { resolveDebtorEntityKind, type DebtorEntityKind } from '@/app/utils/debtorEntityKindUtils';
import { resolveFollowupFlagsForDebtorContext } from '@/app/utils/executionDomainIsolation';
import { applyDebtorDeathFollowupOverlay } from '@/app/utils/partyDeathFollowupOverlay';

export function useFollowupModalSpecializationCluster(input: {
    executionData: ExecutionFile | null | undefined;
    claimType: string | undefined;
    debtorBrowserTabsMode: boolean;
    effectiveFollowupDebtorEntry: { key: string; isPrimary?: boolean; d?: Debtor } | null | undefined;
    activeWorkspaceDebtorForFollowup: { key: string; isPrimary?: boolean; d?: Debtor } | null | undefined;
    followupAssignmentWorkspaceActiveDebtorKey: string | null | undefined;
    followupModalDebtorIsEmployee: boolean;
    followupModalDebtorIsDeceased: boolean;
}) {
    const {
        executionData,
        claimType,
        debtorBrowserTabsMode,
        effectiveFollowupDebtorEntry,
        activeWorkspaceDebtorForFollowup,
        followupAssignmentWorkspaceActiveDebtorKey,
        followupModalDebtorIsEmployee,
        followupModalDebtorIsDeceased,
    } = input;

    const followupModalEntityKind = useMemo((): DebtorEntityKind => {
        const prim = executionData?.debtors?.[0] as Debtor | undefined;
        let debtor: Debtor | Record<string, unknown> | undefined = prim;
        const entry = effectiveFollowupDebtorEntry ?? activeWorkspaceDebtorForFollowup;
        if (debtorBrowserTabsMode && entry) {
            if (!entry.isPrimary) {
                const ad = executionData?.party_multiplicity?.additionalDebtors?.find(
                    (a) => String(a.id) === entry.key,
                );
                debtor = (ad ?? entry.d) as Debtor | Record<string, unknown>;
            } else {
                debtor = prim ?? entry.d;
            }
        }
        return resolveDebtorEntityKind({
            executionData,
            debtor,
            debtorKey: followupAssignmentWorkspaceActiveDebtorKey,
        });
    }, [
        executionData,
        debtorBrowserTabsMode,
        effectiveFollowupDebtorEntry,
        activeWorkspaceDebtorForFollowup,
        followupAssignmentWorkspaceActiveDebtorKey,
    ]);

    const followupModalSpecialization = useMemo(
        () =>
            resolveFollowupFlagsForDebtorContext(
                executionData as Record<string, unknown> | null | undefined,
                {
                    isEmployeeDebtor: followupModalDebtorIsEmployee,
                    fallbackClaimType: claimType,
                    debtorEntityKind: followupModalEntityKind,
                },
            ),
        [executionData, followupModalDebtorIsEmployee, claimType, followupModalEntityKind],
    );

    const followupModalSpecializationEffective = useMemo(
        () =>
            applyDebtorDeathFollowupOverlay(
                followupModalSpecialization,
                Boolean(followupModalDebtorIsDeceased),
            ),
        [followupModalSpecialization, followupModalDebtorIsDeceased],
    );

    return {
        followupModalEntityKind,
        followupModalSpecialization,
        followupModalSpecializationEffective,
    };
}
