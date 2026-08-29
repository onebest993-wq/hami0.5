import React, { useMemo } from 'react';
import { isCustodyRemovalExecutionClaim } from '@/app/utils/executionClaimIsolation';
import type { ExecutionFollowupModalPortalController } from '../hooks/useExecutionFollowupModalPortalController';
import { ExecutionFollowupModalPersonalTabPanel } from './ExecutionFollowupModalPersonalTabPanel';
import { ExecutionFollowupModalCoerciveTabPanel } from './ExecutionFollowupModalCoerciveTabPanel';

export function ExecutionFollowupModalPersonalCoercivePanels({
    c,
}: {
    c: ExecutionFollowupModalPortalController;
}) {
    const custodyRemovalClaimActive = useMemo(
        () =>
            isCustodyRemovalExecutionClaim(
                c.viewExecutionData as Record<string, unknown> | null | undefined,
                String(c.claimType || '').trim() || undefined,
            ),
        [c.viewExecutionData, c.claimType],
    );

    return (
        <>
            <ExecutionFollowupModalPersonalTabPanel
                c={c}
                custodyRemovalClaimActive={custodyRemovalClaimActive}
            />
            <ExecutionFollowupModalCoerciveTabPanel c={c} />
        </>
    );
}
