import { describe, expect, it, vi, beforeEach } from 'vitest';
import { pickCurrentLocationForProfile } from '@/app/services/profile/profileGeolocation';

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: () => false,
}));

describe('pickCurrentLocationForProfile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    });

    it('يعيد التسمية دون toast من طبقة الخدمة', async () => {
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
    });

    it('returns null when the page is not a secure context', async () => {
        Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
        await expect(pickCurrentLocationForProfile()).rejects.toThrow('insecure');
    });
});
