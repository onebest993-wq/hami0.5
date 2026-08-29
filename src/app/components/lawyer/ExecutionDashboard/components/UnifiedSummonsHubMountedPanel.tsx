import React from 'react';
import { UnifiedSummonsHubMountedPanelInner } from './UnifiedSummonsHubMountedPanelInner';

export function UnifiedSummonsHubMountedPanel(
    props: Parameters<typeof UnifiedSummonsHubMountedPanelInner>[0],
) {
    return <UnifiedSummonsHubMountedPanelInner {...props} />;
}
