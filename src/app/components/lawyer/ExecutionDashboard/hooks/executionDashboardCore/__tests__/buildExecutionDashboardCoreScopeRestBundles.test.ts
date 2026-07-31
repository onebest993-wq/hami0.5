import { describe, expect, it, vi } from 'vitest';

import { buildExecutionDashboardCoreScopeRestBundles } from '../buildExecutionDashboardCoreScopeRestBundles';

describe('buildExecutionDashboardCoreScopeRestBundles', () => {
    it('keeps followup and related scope bags for lazy chunk scope assembly', () => {
        const followupScopeBag = {
            effectiveFollowupModalTabs: [{ id: 'correspondences', label: 'المخاطبات' }],
            goFollowupSectionTabByDelta: vi.fn(),
        };
        const coerciveScopeBag = { handleCoerciveAction: vi.fn() };
        const decisionsSeizureEvictionScopeBag = { openDecisionsModalWithBoot: vi.fn() };
        const workspaceScopeBag = { showExecutionTrashModal: true };
        const timelineDossierScopeBag = { activeTimelineEvents: [] };
        const financialScopeBag = { openFinancialHubLedger: vi.fn() };

        const bundles = buildExecutionDashboardCoreScopeRestBundles({
            followupScopeBag,
            coerciveScopeBag,
            decisionsSeizureEvictionScopeBag,
            workspaceScopeBag,
            timelineDossierScopeBag,
            financialScopeBag,
        });

        expect(bundles.followupScopeBag).toBe(followupScopeBag);
        expect(bundles.coerciveScopeBag).toBe(coerciveScopeBag);
        expect(bundles.decisionsSeizureEvictionScopeBag).toBe(decisionsSeizureEvictionScopeBag);
        expect(bundles.workspaceScopeBag).toBe(workspaceScopeBag);
        expect(bundles.timelineDossierScopeBag).toBe(timelineDossierScopeBag);
        expect(bundles.financialScopeBag).toBe(financialScopeBag);
    });
});
