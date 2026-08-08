import React from 'react';
import type { ExecutionFollowupModalPortalController } from '../hooks/useExecutionFollowupModalPortalController';
import { ExecutionFollowupModalShell } from './ExecutionFollowupModalShell';
import { ExecutionFollowupModalTabPanels } from './ExecutionFollowupModalTabPanels';

/** طبقة العرض — Shell + TabPanels (منفصلة عن Portal/createPortal) */
export function ExecutionFollowupModalView({
    controller,
}: {
    controller: ExecutionFollowupModalPortalController;
}) {
    return (
        <ExecutionFollowupModalShell c={controller}>
            <ExecutionFollowupModalTabPanels c={controller} />
        </ExecutionFollowupModalShell>
    );
}
