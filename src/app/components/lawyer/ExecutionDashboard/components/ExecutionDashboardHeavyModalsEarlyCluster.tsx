/** Documents → alimony overlays — thin EarlyCluster composer (no visual change) */
import React from 'react';
import { ExecutionDashboardHeavyModalsEarlyDocumentsDecisions } from './ExecutionDashboardHeavyModalsEarlyDocumentsDecisions';
import { ExecutionDashboardHeavyModalsEarlyOpsStrip } from './ExecutionDashboardHeavyModalsEarlyOpsStrip';
import { ExecutionDashboardHeavyModalsEarlyPartyOverlays } from './ExecutionDashboardHeavyModalsEarlyPartyOverlays';

/** Cast surface retained for hotspot honesty + sibling LooseComp pattern */
export type LooseComp = React.ComponentType<Record<string, unknown>>;

export function ExecutionDashboardHeavyModalsEarlyCluster({ s }: { s: Record<string, unknown> }) {
    return (
        <>
            <ExecutionDashboardHeavyModalsEarlyDocumentsDecisions s={s} />
            <ExecutionDashboardHeavyModalsEarlyOpsStrip s={s} />
            <ExecutionDashboardHeavyModalsEarlyPartyOverlays s={s} />
        </>
    );
}
