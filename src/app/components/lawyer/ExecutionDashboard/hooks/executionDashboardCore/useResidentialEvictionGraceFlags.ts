import { useMemo } from 'react';

export function useResidentialEvictionGraceFlags(p: {
    isEvictionExecutionModule: unknown;
    evictionPremisesUseResolved: unknown;
    evictionResidentialGracePeriodStart: unknown;
    evictionVacateDeadlineLocal: unknown;
    evictionResidentialGraceManuallyEndedAt: unknown;
    decisionsStorageExecutionId: unknown;
    executionId: unknown;
    decisionsReloadEpoch: unknown;
    isResidentialVacateGraceFinished: unknown;
    executionData: unknown;
    hasActiveResidentialEvictionGrace: (input: {
        premisesUse?: string;
        gracePeriodStart?: string | null;
        vacateDeadline?: string | null;
        manuallyEndedAt?: string | null;
    }) => boolean;
    readExecutorDecisionsArray: (exId: string) => unknown;
    isExecutorRowEffectivelyApproved: (row: Record<string, unknown>) => boolean;
}) {
    const showResidentialEvictionGraceControl =
        Boolean(p.isEvictionExecutionModule) && p.evictionPremisesUseResolved === 'residential';

    const residentialGracePeriodSaved = useMemo(
        () =>
            p.hasActiveResidentialEvictionGrace({
                premisesUse: p.evictionPremisesUseResolved as string | undefined,
                gracePeriodStart: p.evictionResidentialGracePeriodStart as string | null | undefined,
                vacateDeadline: p.evictionVacateDeadlineLocal as string | null | undefined,
                manuallyEndedAt: p.evictionResidentialGraceManuallyEndedAt as string | null | undefined,
            }),
        [
            p.hasActiveResidentialEvictionGrace,
            p.evictionPremisesUseResolved,
            p.evictionResidentialGracePeriodStart,
            p.evictionVacateDeadlineLocal,
            p.evictionResidentialGraceManuallyEndedAt,
        ],
    );

    const residentialGraceEarlyEndApproved = useMemo(() => {
        if (residentialGracePeriodSaved) return false;
        const exId = String(p.decisionsStorageExecutionId || p.executionId || '').trim();
        if (!exId) return false;
        const rows = p.readExecutorDecisionsArray(exId) as Array<Record<string, unknown>>;
        return rows.some((d) => {
            if (String((d as { requestKind?: string }).requestKind || '') !== 'eviction_procedure') {
                return false;
            }
            if (
                String((d as { evictionWorkflowKey?: string }).evictionWorkflowKey || '') !==
                'residential_grace_early_end'
            ) {
                return false;
            }
            return p.isExecutorRowEffectivelyApproved(d);
        });
    }, [
        residentialGracePeriodSaved,
        p.decisionsStorageExecutionId,
        p.executionId,
        p.decisionsReloadEpoch,
        p.readExecutorDecisionsArray,
        p.isExecutorRowEffectivelyApproved,
    ]);

    const showResidentialGraceEarlyEndRequest = residentialGracePeriodSaved;

    const residentialGraceAllowsFieldwork = useMemo(() => {
        if (!p.isEvictionExecutionModule) return true;
        if (p.evictionPremisesUseResolved !== 'residential') return true;
        if (!residentialGracePeriodSaved) return true;
        if (residentialGraceEarlyEndApproved) return true;
        if (p.isResidentialVacateGraceFinished) return true;
        if (
            Boolean(
                (p.executionData as { eviction_residential_grace_manually_ended_at?: string })
                    ?.eviction_residential_grace_manually_ended_at,
            )
        ) {
            return true;
        }
        return false;
    }, [
        p.isEvictionExecutionModule,
        p.evictionPremisesUseResolved,
        residentialGracePeriodSaved,
        residentialGraceEarlyEndApproved,
        p.isResidentialVacateGraceFinished,
        p.executionData,
    ]);

    const showBreakInventoryRequest = residentialGraceAllowsFieldwork;

    return {
        showResidentialEvictionGraceControl,
        residentialGracePeriodSaved,
        residentialGraceEarlyEndApproved,
        showResidentialGraceEarlyEndRequest,
        residentialGraceAllowsFieldwork,
        showBreakInventoryRequest,
    };
}
