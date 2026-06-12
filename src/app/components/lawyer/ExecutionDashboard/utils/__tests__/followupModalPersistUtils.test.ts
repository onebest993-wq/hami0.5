import { describe, expect, it } from 'vitest';
import { resolveFollowupTabOnOpen } from '@/app/components/lawyer/ExecutionDashboard/utils/followupModalPersistUtils';

describe('resolveFollowupTabOnOpen', () => {
    const order = ['personal', 'coercive', 'correspondences'] as const;

    it('routes explicit seizure_requests to seizure opener', () => {
        expect(
            resolveFollowupTabOnOpen({
                explicitTab: 'seizure_requests',
                allowedTabOrder: order,
            })
        ).toEqual({ tab: null, routeSeizureRequests: true });
    });

    it('restores saved tab when still allowed', () => {
        expect(
            resolveFollowupTabOnOpen({
                savedTab: 'coercive',
                allowedTabOrder: order,
            })
        ).toEqual({ tab: 'coercive', routeSeizureRequests: false });
    });

    it('falls back to first allowed tab when saved tab is stale', () => {
        expect(
            resolveFollowupTabOnOpen({
                savedTab: 'financial',
                allowedTabOrder: order,
            })
        ).toEqual({ tab: 'personal', routeSeizureRequests: false });
    });

    it('defaults to correspondences when order is empty', () => {
        expect(
            resolveFollowupTabOnOpen({
                allowedTabOrder: [],
            })
        ).toEqual({ tab: 'correspondences', routeSeizureRequests: false });
    });
});
