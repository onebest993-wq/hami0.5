import React from 'react';
import { FocLazyOverlay } from './focOverlaySurfacesLazy';
import type { DebtorAgentFinancialHubPanelProps } from './components/DebtorAgentFinancialHubPanel';
import {
    LazyDebtorAgentFinancialHubPanel,
    prefetchFocDebtorAgentFinancialHubPanel,
} from './focLedgerMotionLazy';

export function FocLazyDebtorAgentFinancialHubPanel(
    props: DebtorAgentFinancialHubPanelProps,
): React.ReactElement {
    prefetchFocDebtorAgentFinancialHubPanel();
    return (
        <FocLazyOverlay
            lazy={LazyDebtorAgentFinancialHubPanel}
            lazyProps={props}
            fallback={<div className="min-h-[44px]" aria-hidden />}
        />
    );
}
