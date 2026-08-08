import { useMemo } from 'react';
import { isCustodyRemovalExecutionClaim } from '@/app/utils/executionClaimIsolation';

export function useExecutionDashboardPhoneBodyCustodyLabels(
    viewExecutionData: unknown,
    claimType: unknown,
) {
    const isCustodyRemovalClaimActive = useMemo(
        () =>
            isCustodyRemovalExecutionClaim(
                viewExecutionData as Record<string, unknown> | null | undefined,
                String(claimType || '').trim() || undefined,
            ),
        [viewExecutionData, claimType],
    );

    const custodyWardNamesResolved = useMemo(() => {
        const raw = (viewExecutionData as { custodyWardNames?: unknown } | null | undefined)
            ?.custodyWardNames;
        return Array.isArray(raw)
            ? raw.map((n) => String(n).trim()).filter(Boolean)
            : [];
    }, [viewExecutionData]);

    return { isCustodyRemovalClaimActive, custodyWardNamesResolved };
}
