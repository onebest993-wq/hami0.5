import { describe, expect, it } from 'vitest';
import { isSearchHeaderBusy } from '@/app/components/lawyer/GlobalSearchOverlay/utils/searchHeaderBusy';

describe('isSearchHeaderBusy', () => {
    it('is false when query is empty even if index is enriching', () => {
        expect(isSearchHeaderBusy('', false, false)).toBe(false);
        expect(isSearchHeaderBusy('   ', true, true)).toBe(false);
    });

    it('is true only when query exists and search or index load is active', () => {
        expect(isSearchHeaderBusy('دعوى', true, false)).toBe(true);
        expect(isSearchHeaderBusy('دعوى', false, true)).toBe(true);
        expect(isSearchHeaderBusy('دعوى', false, false)).toBe(false);
    });
});
