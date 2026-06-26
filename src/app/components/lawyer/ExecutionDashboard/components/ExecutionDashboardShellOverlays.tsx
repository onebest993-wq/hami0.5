// @ts-nocheck
/** Shell overlays — chunk منفصل */
import React from 'react';
import { ExecutionDashboardEditOverlays } from './ExecutionDashboardEditOverlays';
import { ExecutionDashboardNotesOverlays } from './ExecutionDashboardNotesOverlays';
import { ExecutionDashboardExecutorWorkflowOverlays } from './ExecutionDashboardExecutorWorkflowOverlays';
import { ExecutionDashboardHeavyModals } from './ExecutionDashboardHeavyModals';
import { ExecutionDashboardSolidaryEvictionOverlays } from './ExecutionDashboardSolidaryEvictionOverlays';
import { ExecutionFollowupModalHost } from './ExecutionFollowupModalHost';
import { ExecutionDashboardSeizedPropertyPortals } from './ExecutionDashboardSeizedPropertyPortals';
import { pickSeizedPropertyPortalProps } from '../hooks/pickSeizedPropertyPortalProps';
import { pickExecutionShellOverlayProps } from '../hooks/pickExecutionShellOverlayProps';
import { buildFollowupModalSnapshotInput } from '../hooks/buildFollowupModalSnapshotInput';
import { useExecutionFollowupModalSnapshot } from '../hooks/useExecutionFollowupModalSnapshot';
import {
    readExecutionShellOverlayScope,
    useExecutionShellOverlayScopeRef,
} from '../hooks/executionShellOverlayScope';

export type ExecutionDashboardShellOverlaysProps = {
    showUnifiedExecutionModal?: boolean;
};

export function ExecutionDashboardShellOverlays({
    showUnifiedExecutionModal = false,
}: ExecutionDashboardShellOverlaysProps) {
    const scopeRef = useExecutionShellOverlayScopeRef();
    const scope = readExecutionShellOverlayScope(scopeRef);
    const props = pickExecutionShellOverlayProps(scope);

    const followupSnapshot = useExecutionFollowupModalSnapshot(
        showUnifiedExecutionModal,
        () => buildFollowupModalSnapshotInput(scope),
    );

    const merged = {
        ...props,
        executionFollowupModalSnapshot: followupSnapshot,
    };

    return (
        <>
            <ExecutionDashboardEditOverlays {...merged} />
            <ExecutionDashboardNotesOverlays {...merged} />
            <ExecutionDashboardExecutorWorkflowOverlays {...merged} />
            <ExecutionDashboardHeavyModals {...merged} />
            <ExecutionFollowupModalHost
                open={showUnifiedExecutionModal}
                snapshot={followupSnapshot}
            />
            <ExecutionDashboardSolidaryEvictionOverlays {...merged} />
            <ExecutionDashboardSeizedPropertyPortals {...pickSeizedPropertyPortalProps(scope)} />
        </>
    );
}
