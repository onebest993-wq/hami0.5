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
    const showPersonal = c.panelsToRender.has('personal');
    const custodyRemovalClaimActive = useMemo(
        () =>
            showPersonal &&
            isCustodyRemovalExecutionClaim(
                c.viewExecutionData as Record<string, unknown> | null | undefined,
                String(c.claimType || '').trim() || undefined,
            ),
        [c.viewExecutionData, c.claimType, showPersonal],
    );

    return (
        <>
            {showPersonal ? (
                <ExecutionFollowupModalPersonalTabPanel
                    c={c}
                    custodyRemovalClaimActive={custodyRemovalClaimActive}
                />
            ) : null}
            {c.panelsToRender.has('coercive') ? (
                <ExecutionFollowupModalCoerciveTabPanel c={c} />
            ) : null}
        </>
    );
}
