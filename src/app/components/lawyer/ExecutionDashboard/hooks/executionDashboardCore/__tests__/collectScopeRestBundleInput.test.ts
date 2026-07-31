import { describe, expect, it } from 'vitest';

import { collectScopeRestBundleInput } from '../collectScopeRestBundleInput';

describe('collectScopeRestBundleInput', () => {
    it('preserves named scope bags alongside flattened rest keys', () => {
        const followupScopeBag = { effectiveFollowupModalTabs: [{ id: 'admin', label: 'نماذج الطلبات' }] };
        const coerciveScopeBag = { handleCoerciveAction: () => undefined };
        const decisionsSeizureEvictionScopeBag = { openDecisionsModalWithBoot: () => undefined };
        const workspaceScopeBag = { showExecutionTrashModal: true };
        const timelineDossierScopeBag = { activeTimelineEvents: [] };
        const financialScopeBag = { openFinancialHubLedger: () => undefined };

        const collected = collectScopeRestBundleInput({
            runtimeFns: {},
            eviction: {},
            summons: {},
            decisions: {},
            modals: {},
            followupDerived: {},
            claimDisplay: {},
            partyDeath: {},
            debtorProfile: {},
            masterState: {},
            inaba: {},
            executor: {},
            breakInv: {},
            judicial: {},
            financialAlimony: {},
            header: {},
            runtimeConstants: {},
            followupScopeBag,
            coerciveScopeBag,
            decisionsSeizureEvictionScopeBag,
            workspaceScopeBag,
            timelineDossierScopeBag,
            financialScopeBag,
            handlerClusterExtras: {},
        });

        expect(
            (collected as { effectiveFollowupModalTabs?: unknown }).effectiveFollowupModalTabs,
        ).toEqual(followupScopeBag.effectiveFollowupModalTabs);
        expect(collected.followupScopeBag).toBe(followupScopeBag);
        expect(collected.coerciveScopeBag).toBe(coerciveScopeBag);
        expect(collected.decisionsSeizureEvictionScopeBag).toBe(decisionsSeizureEvictionScopeBag);
        expect(collected.workspaceScopeBag).toBe(workspaceScopeBag);
        expect(collected.timelineDossierScopeBag).toBe(timelineDossierScopeBag);
        expect(collected.financialScopeBag).toBe(financialScopeBag);
    });
});
