import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    resolveHomeWidgetStageDelays,
    shouldPaintHomeHubTilesImmediately,
} from '@/app/runtime/homeWidgetStagePolicy';

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: vi.fn(),
}));

import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

describe('homeWidgetStagePolicy', () => {
    beforeEach(() => {
        vi.mocked(isCapacitorNativePlatform).mockReturnValue(false);
    });

    it('يرسم بلاطات المنزل فوراً عبر الكشف الموحّد', () => {
        const delays = resolveHomeWidgetStageDelays();
        expect(delays.secondary.minDelayMs).toBe(0);
        expect(delays.forum.minDelayMs).toBe(0);
        expect(shouldPaintHomeHubTilesImmediately()).toBe(true);
    });

    it('يؤجّل overlays قليلاً على الأصلي فقط', () => {
        vi.mocked(isCapacitorNativePlatform).mockReturnValue(true);
        const delays = resolveHomeWidgetStageDelays();
        expect(delays.overlays.minDelayMs).toBeGreaterThan(0);
    });
});
