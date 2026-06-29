import { describe, expect, it } from 'vitest';
import { resolveLawyerDisplayName } from '@/app/services/profile/resolveLawyerDisplayName';
import { DEV_MOCK_LAWYER_NAME, GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';

describe('resolveLawyerDisplayName', () => {
    it('uses guest mock name when profile has stale demo label', () => {
        expect(resolveLawyerDisplayName('محامٍ تجريبي', GUEST_LAWYER_ID, {})).toBe(DEV_MOCK_LAWYER_NAME);
    });

    it('keeps custom profile name for guest when set', () => {
        expect(resolveLawyerDisplayName('سارة العراقي', GUEST_LAWYER_ID, {})).toBe('سارة العراقي');
    });
});
