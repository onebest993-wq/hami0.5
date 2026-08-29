import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
    canonicalFollowupTabForPrefetch,
    normalizeLegacyFollowupTabOnOpen,
    resolveLegacyFollowupTabRuntimeRedirect,
} from '@/app/components/lawyer/ExecutionDashboard/utils/followupLegacyTabNormalization';
import { simulateFollowupModalJourney } from './support/followupModalJourneyHarness';

describe('followupLegacyTabNormalization', () => {
    it('maps financial to seizure route on open', () => {
        expect(normalizeLegacyFollowupTabOnOpen('financial')).toEqual({
            tab: null,
            routeSeizureRequests: true,
        });
    });

    it('maps special to admin on open', () => {
        expect(normalizeLegacyFollowupTabOnOpen('special')).toEqual({
            tab: 'admin',
            routeSeizureRequests: false,
        });
    });

    it('redirects runtime financial to seizure_requests when that tab exists', () => {
        expect(
            resolveLegacyFollowupTabRuntimeRedirect({
                unifiedModalTab: 'financial',
                effectiveFollowupSectionTabOrder: ['personal', 'coercive', 'seizure_requests'],
                hideFollowupCoerciveTab: false,
            }),
        ).toBe('seizure_requests');
    });

    it('canonicalizes prefetch ids', () => {
        expect(canonicalFollowupTabForPrefetch('financial')).toBe('seizure_requests');
        expect(canonicalFollowupTabForPrefetch('special')).toBe('admin');
        expect(canonicalFollowupTabForPrefetch('coercive')).toBe('coercive');
    });
});

describe('followupModalJourneyHarness', () => {
    const storageKey = 'hami-followup-modal:journey-harness-test';

    beforeEach(() => {
        sessionStorage.removeItem(storageKey);
    });

    afterEach(() => {
        sessionStorage.removeItem(storageKey);
    });

    it('open → switch → close → reopen restores persisted tab', () => {
        const journey = simulateFollowupModalJourney(
            {
                claimType: 'استحصال دين مالي',
                isEmployee: false,
                financialCenterTotalIqd: 400_000,
            },
            ['__open__', 'correspondences', '__close__', '__open__'],
            storageKey,
        );

        expect(journey.scenarioTabIds).toContain('personal');
        expect(journey.steps[0].action).toBe('open');
        expect(journey.steps[1]).toMatchObject({
            action: 'switch_tab',
            tab: 'correspondences',
        });
        expect(journey.persistTabAfterClose).toBe('correspondences');

        const reopen = journey.steps[3];
        expect(reopen).toMatchObject({
            action: 'open',
            tab: 'correspondences',
            routeSeizureRequests: false,
        });
    });

    it('legacy financial saved tab routes to seizure on reopen', () => {
        sessionStorage.setItem(storageKey, JSON.stringify({ tab: 'financial' }));
        const journey = simulateFollowupModalJourney(
            {
                claimType: 'استحصال دين مالي',
                isEmployee: false,
                financialCenterTotalIqd: 400_000,
            },
            ['__open__'],
            storageKey,
        );
        expect(journey.steps[0]).toMatchObject({
            action: 'open',
            routeSeizureRequests: true,
        });
        expect(journey.finalTab).toBe('seizure_requests');
    });

    it('deceased scenario hides hidden toggle in journey snapshot', () => {
        const journey = simulateFollowupModalJourney(
            {
                claimType: 'استحصال دين مالي',
                isEmployee: false,
                activeDebtorIsDeceased: true,
                financialCenterTotalIqd: 400_000,
            },
            ['__open__'],
            storageKey,
        );
        expect(journey.hiddenToggleVisible).toBe(false);
    });
});
