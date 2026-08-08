import { describe, expect, it } from 'vitest';
import {
    FOLLOWUP_ACTION_REGISTRY,
    FOLLOWUP_REGISTRY_ACTION_IDS,
    registryIdForHiddenPersonalKey,
} from '../followupActionRegistry';
import { resolveFollowupHiddenActions } from '../resolveFollowupHiddenActions';

describe('followupActionRegistry', () => {
    it('covers all hidden personal and guarantor catalog keys', () => {
        const personalIds = FOLLOWUP_ACTION_REGISTRY.filter(
            (e) => e.surface === 'hidden_personal_coercive',
        ).map((e) => e.id);
        const guarantorIds = FOLLOWUP_ACTION_REGISTRY.filter(
            (e) => e.surface === 'hidden_guarantor',
        ).map((e) => e.id);
        expect(personalIds).toHaveLength(5);
        expect(guarantorIds).toHaveLength(4);
        expect(FOLLOWUP_REGISTRY_ACTION_IDS).toContain('hidden:toggle');
        expect(FOLLOWUP_REGISTRY_ACTION_IDS).toContain('hidden:break_inventory');
    });

    it('maps registry ids for personal keys', () => {
        expect(registryIdForHiddenPersonalKey('travel_ban')).toBe('hidden_personal:travel_ban');
    });
});

describe('resolveFollowupHiddenActions', () => {
    it('employee financial lists buried personal without detention paths', () => {
        const snapshot = resolveFollowupHiddenActions({
            claimType: 'استحصال دين مالي',
            isEmployee: true,
            financialCenterTotalIqd: 400_000,
        });
        expect(snapshot.hiddenPersonalCoerciveKeys).toEqual(['forced_bring_in', 'travel_ban']);
        expect(snapshot.hiddenGuarantorKeys).toContain('guarantor_request');
        expect(snapshot.hasAnyHiddenContent).toBe(true);
        expect(snapshot.registryActionIds).toContain(registryIdForHiddenPersonalKey('forced_bring_in'));
    });

    it('earner financial with open personal tab hides buried personal coercive', () => {
        const snapshot = resolveFollowupHiddenActions({
            claimType: 'استحصال دين مالي',
            isEmployee: false,
            financialCenterTotalIqd: 400_000,
        });
        expect(snapshot.hiddenPersonalCoerciveKeys).toHaveLength(0);
        expect(snapshot.hasAnyHiddenContent).toBe(false);
    });

    it('deceased debtor disables hidden toggle and content', () => {
        const snapshot = resolveFollowupHiddenActions({
            claimType: 'استحصال دين مالي',
            isEmployee: false,
            activeDebtorIsDeceased: true,
            financialCenterTotalIqd: 400_000,
        });
        expect(snapshot.hiddenToggleVisible).toBe(false);
        expect(snapshot.hasAnyHiddenContent).toBe(false);
        expect(snapshot.registryActionIds).toHaveLength(0);
    });

    it('specific delivery immovable pending exposes break inventory in hidden', () => {
        const snapshot = resolveFollowupHiddenActions({
            claimType: 'تسليم شيء معين',
            isEmployee: false,
            specificDeliveryItems: [
                { id: 'sd-1', name: 'عقار', nature: 'immovable', status: 'pending' },
            ],
        });
        expect(snapshot.breakInventoryVisible).toBe(true);
        expect(snapshot.hasAnyHiddenContent).toBe(true);
        expect(snapshot.registryActionIds).toContain('hidden:break_inventory');
    });
});
