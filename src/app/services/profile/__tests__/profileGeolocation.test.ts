import { describe, expect, it, vi, beforeEach } from 'vitest';
import { pickCurrentLocationForProfile } from '@/app/services/profile/profileGeolocation';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: () => false,
}));

import { SmartToast } from '@/app/components/ui/SmartToast';

describe('pickCurrentLocationForProfile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    });

    it('لا يعلن نجاحاً قبل أن يطبّق المستدعي القيمة', async () => {
        vi.stubGlobal('navigator', {
            geolocation: {
                getCurrentPosition: (ok: PositionCallback) => {
                    ok({
                        coords: {
                            latitude: 33.3,
                            longitude: 44.4,
                            accuracy: 10,
                            altitude: null,
                            altitudeAccuracy: null,
                            heading: null,
                            speed: null,
                            toJSON: () => ({}),
                        },
                        timestamp: Date.now(),
                        toJSON: () => ({}),
                    } as GeolocationPosition);
                },
            },
        });

        const label = await pickCurrentLocationForProfile();
        expect(label).toBe('33.300000,44.400000');
        expect(SmartToast.success).not.toHaveBeenCalled();
    });
});
