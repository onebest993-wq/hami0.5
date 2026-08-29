import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    clearCachedGlobalSearchExtras,
    emptyGlobalSearchExtras,
    setCachedGlobalSearchExtras,
} from '@/app/services/globalSearchExtrasCache';
import { hasGlobalSearchLocalWarmCache } from '@/app/services/search/globalSearchLocalWarmProbe';

vi.mock('@/app/services/globalSearchFuse', () => ({
    hasAnyCachedGlobalSearchFuse: () => false,
}));

describe('globalSearchLocalWarmProbe', () => {
    afterEach(() => {
        clearCachedGlobalSearchExtras();
    });

    it('يرى extras بعد الكتابة في الكاش الموحّد', () => {
        expect(hasGlobalSearchLocalWarmCache('u1')).toBe(false);
        setCachedGlobalSearchExtras('u1', emptyGlobalSearchExtras(), false);
        expect(hasGlobalSearchLocalWarmCache('u1')).toBe(true);
        expect(hasGlobalSearchLocalWarmCache('u2')).toBe(false);
        expect(hasGlobalSearchLocalWarmCache(null)).toBe(false);
    });
});
