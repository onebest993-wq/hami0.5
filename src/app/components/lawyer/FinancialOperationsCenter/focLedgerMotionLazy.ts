import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';

export const LazySettlementRepaymentStripPanel = createPreloadableLazyComponent(() =>
    import('./components/SettlementRepaymentStripPanel').then((m) => ({
        default: m.SettlementRepaymentStripPanel,
    })),
);
export const LazyUnifiedLedgerSettlementPanel = createPreloadableLazyComponent(() =>
    import('./components/UnifiedLedgerSettlementPanel').then((m) => ({
        default: m.UnifiedLedgerSettlementPanel,
    })),
);
export const LazyDebtorAgentFinancialHubPanel = createPreloadableLazyComponent(() =>
    import('./components/DebtorAgentFinancialHubPanel').then((m) => ({
        default: m.DebtorAgentFinancialHubPanel,
    })),
);
export const LazyFocCreditorExpandedBodyCollapsible = createPreloadableLazyComponent(() =>
    import('./components/FocCreditorExpandedBodyCollapsible').then((m) => ({
        default: m.FocCreditorExpandedBodyCollapsible,
    })),
);

export function prefetchFocSettlementRepaymentStripPanel(): void {
    void LazySettlementRepaymentStripPanel.preload();
}
export function prefetchFocUnifiedLedgerSettlementPanel(): void {
    void LazyUnifiedLedgerSettlementPanel.preload();
}
export function prefetchFocDebtorAgentFinancialHubPanel(): void {
    void LazyDebtorAgentFinancialHubPanel.preload();
}
export function prefetchFocCreditorExpandedBodyCollapsible(): void {
    void LazyFocCreditorExpandedBodyCollapsible.preload();
}
