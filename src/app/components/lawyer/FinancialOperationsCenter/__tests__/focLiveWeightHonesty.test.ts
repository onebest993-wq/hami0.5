import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel: string): string {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('FOC-open live weight honesty', () => {
    const main = read('src/app/components/lawyer/FinancialOperationsCenter.tsx');
    const overlays = read(
        'src/app/components/lawyer/FinancialOperationsCenter/focOverlaySurfacesLazy.tsx',
    );
    const payment = read(
        'src/app/components/lawyer/FinancialOperationsCenter/useFocPaymentDisburseActions.ts',
    );
    const settlement = read(
        'src/app/components/lawyer/FinancialOperationsCenter/useFocSettlementActions.ts',
    );
    const ghuramaa = read(
        'src/app/components/lawyer/FinancialOperationsCenter/useFocGhuramaaActions.ts',
    );
    const distribution = read(
        'src/app/components/lawyer/FinancialOperationsCenter/focGhuramaaDistribution.ts',
    );
    const equalSplit = read(
        'src/app/components/lawyer/FinancialOperationsCenter/focGhuramaaEqualSplit.ts',
    );

    it('FOC first paint does not static-import overlay surfaces or the creation-form barrel', () => {
        expect(main).toContain("from './FinancialOperationsCenter/focOverlaySurfacesLazy'");
        expect(main).toContain('FocLazyOverlay');
        expect(main).not.toMatch(
            /from\s+['"]\.\/FinancialOperationsCenter\/components\/FocDisburseModal['"]/,
        );
        expect(main).not.toMatch(
            /from\s+['"]\.\/FinancialOperationsCenter\/components\/FocGhuramaaModal['"]/,
        );
        expect(main).not.toMatch(
            /from\s+['"]\.\/FinancialOperationsCenter\/components\/FocFeesSheet['"]/,
        );
        expect(main).not.toMatch(
            /from\s+['"]\.\/FinancialOperationsCenter\/components\/FocExpenseSheet['"]/,
        );
        expect(main).not.toMatch(
            /from\s+['"]\.\/FinancialOperationsCenter\/components\/FocGarnishModal['"]/,
        );
        expect(main).not.toMatch(
            /from\s+['"]\.\/FinancialOperationsCenter\/components\/DebtTotalsEditModal['"]/,
        );
        expect(main).not.toMatch(/from\s+['"]\.\/Modal_Guarantor_Registration['"]/);
        expect(main).not.toMatch(/from\s+['"]\.\/AlimonyFinancialBlock['"]/);
        expect(main).not.toContain('alimonyPaymentEngine');
        expect(main).not.toContain('executionFormUtils');
        expect(main).not.toContain('executionFormDebtorShares');
        expect(main).not.toMatch(/lawyer\/ExecutionDashboard\//);
    });

    it('overlay factories are dynamic import() only and stay inside FOC', () => {
        expect(overlays).toContain('createPreloadableLazyComponent');
        expect(overlays).toContain("import('./components/FocDisburseModal')");
        expect(overlays).toContain("import('./components/FocGhuramaaModal')");
        expect(overlays).toContain("import('./components/DebtTotalsEditModal')");
        expect(overlays).toContain("import('./components/FocFeesSheet')");
        expect(overlays).toContain("import('./components/FocExpenseSheet')");
        expect(overlays).toContain("import('./components/FocGarnishModal')");
        expect(overlays).toContain("import('./components/FocAlimonyDetailOverlay')");
        expect(overlays).not.toContain('Modal_Guarantor_Registration');
        expect(overlays).not.toContain('AlimonyFinancialBlock');
        expect(overlays).not.toMatch(/from\s+['"]\.\/components\/FocDisburseModal['"]/);
        expect(overlays).not.toMatch(/lawyer\/ExecutionDashboard\//);
        expect(overlays).toContain("@/app/utils/lazy/preloadableOverlayGate");
        expect(overlays).toContain('PreloadableOverlayGate');
    });

    it('payment and settlement confirm dialogs are dynamic; ghuramaa equal-split leaf is deferred', () => {
        expect(payment).not.toContain('executionFormUtils');
        expect(payment).not.toContain('executionFormDebtorShares');
        expect(payment).not.toContain('buildGhuramaaContext');
        expect(payment).not.toMatch(/from\s+['"]@\/app\/components\/ui\/SmartDialog['"]/);
        expect(payment).toContain("import('@/app/components/ui/SmartDialog')");
        expect(settlement).not.toMatch(/from\s+['"]@\/app\/components\/ui\/SmartDialog['"]/);
        expect(settlement).toContain("import('@/app/components/ui/SmartDialog')");
        expect(settlement).not.toMatch(/from\s+['"]\.\/alimonyOngoingAccrual['"]/);
        expect(settlement).toContain("import('./alimonyOngoingAccrual')");
        expect(ghuramaa).toContain("import('./focGhuramaaEqualSplit')");
        expect(ghuramaa).not.toContain('executionFormDebtorShares');
        expect(distribution).not.toContain('executionFormDebtorShares');
        expect(distribution).not.toContain('executionFormUtils');
        expect(equalSplit).toContain(
            '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormDebtorShares',
        );
        expect(equalSplit).not.toContain('executionFormUtils');
    });

    it('FOC-open graph does not parse overlayMotion; overlay preload starts on pointer and keyboard focus', () => {
        const ledger = read(
            'src/app/components/lawyer/FinancialOperationsCenter/components/StandardFinancialLedger.tsx',
        );
        const header = read(
            'src/app/components/lawyer/FinancialOperationsCenter/components/FocFundsCardHeader.tsx',
        );
        const body = read(
            'src/app/components/lawyer/FinancialOperationsCenter/components/FocCreditorExpandedBody.tsx',
        );
        const motionLazy = read(
            'src/app/components/lawyer/FinancialOperationsCenter/focLedgerMotionLazy.ts',
        );
        const collapsible = read(
            'src/app/components/lawyer/FinancialOperationsCenter/components/FocCreditorExpandedBodyCollapsible.tsx',
        );
        expect(ledger).toContain('focPrepareOverlay');
        expect(ledger).toContain('prefetchFocDisburseModal');
        expect(ledger).toMatch(/from\s+['"]\.\/ReactiveSettlementEntry['"]/);
        expect(ledger).toMatch(/from\s+['"]\.\/SettlementRepaymentStrip['"]/);
        expect(ledger).not.toContain('overlayMotionRuntime');
        const settlementEntry = read(
            'src/app/components/lawyer/FinancialOperationsCenter/components/ReactiveSettlementEntry.tsx',
        );
        const repaymentStrip = read(
            'src/app/components/lawyer/FinancialOperationsCenter/components/SettlementRepaymentStrip.tsx',
        );
        expect(settlementEntry).not.toContain('overlayMotionRuntime');
        expect(settlementEntry).not.toContain('<motion');
        expect(repaymentStrip).not.toContain('overlayMotionRuntime');
        expect(repaymentStrip).toContain('LazySettlementRepaymentStripPanel');
        expect(header).toContain('focPrepareOverlay');
        expect(header).toContain('prefetchFocAlimonyDetailOverlay');
        expect(body).toContain('prefetchFocGhuramaaModal');
        expect(body).toContain('focPrepareOverlay');
        expect(body).not.toContain('overlayMotionRuntime');
        expect(main).not.toContain('overlayMotionRuntime');
        expect(main).not.toMatch(
            /from\s+['"]\.\/FinancialOperationsCenter\/components\/DebtorAgentFinancialHubPanel['"]/,
        );
        expect(main).not.toMatch(
            /from\s+['"]\.\/FinancialOperationsCenter\/components\/UnifiedLedgerSettlementPanel['"]/,
        );
        expect(main).toContain('FocLazyDebtorAgentFinancialHubPanel');
        expect(motionLazy).toContain("import('./components/SettlementRepaymentStripPanel')");
        expect(motionLazy).not.toContain("import('./components/ReactiveSettlementEntry')");
        expect(motionLazy).toContain("import('./components/UnifiedLedgerSettlementPanel')");
        expect(motionLazy).toContain("import('./components/DebtorAgentFinancialHubPanel')");
        expect(collapsible).toContain('overlayMotionRuntime');
        expect(settlement).toContain('prefetchFocUnifiedLedgerSettlementPanel');
        expect(main).not.toContain('alimonyPaymentEngine');
    });
});
