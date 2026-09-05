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
    const p = c.panelsToRender;
    return (
        <>
            {p.has('correspondences') ? <ExecutionFollowupModalCorrespondencesPanel c={c} /> : null}
            {p.has('dossier_controls') ? <ExecutionFollowupModalDossierControlsPanel c={c} /> : null}
            {p.has('admin') ? <ExecutionFollowupModalAdminRequestsPanel c={c} /> : null}
        </>
    );
}
