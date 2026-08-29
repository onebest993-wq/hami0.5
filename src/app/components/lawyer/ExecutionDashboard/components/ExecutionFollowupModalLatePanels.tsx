import React from 'react';
import { ExecutionFollowupModalCorrespondencesPanel } from './ExecutionFollowupModalCorrespondencesPanel';
import { ExecutionFollowupModalDossierControlsPanel } from './ExecutionFollowupModalDossierControlsPanel';
import { ExecutionFollowupModalAdminRequestsPanel } from './ExecutionFollowupModalAdminRequestsPanel';
import type { ExecutionFollowupModalPortalController } from '../hooks/useExecutionFollowupModalPortalController';

export function ExecutionFollowupModalLatePanels({
    c,
}: {
    c: ExecutionFollowupModalPortalController;
}) {
    return (
        <>
            <ExecutionFollowupModalCorrespondencesPanel c={c} />
            <ExecutionFollowupModalDossierControlsPanel c={c} />
            <ExecutionFollowupModalAdminRequestsPanel c={c} />
        </>
    );
}
