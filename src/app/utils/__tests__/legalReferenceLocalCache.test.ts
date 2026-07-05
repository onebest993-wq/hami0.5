import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    LEGAL_REFERENCE_DEFAULT_TTL_MS,
    isLegalReferenceCacheStale,
    readLegalReferenceCache,
    resetLegalReferenceCacheForTests,
    writeLegalReferenceCache,
} from '@/app/utils/legalReferenceLocalCache';

describe('legalReferenceLocalCache', () => {
    beforeEach(() => {
        resetLegalReferenceCacheForTests();
    });

    it('يقرأ ويكتب snapshot محلي', () => {
        writeLegalReferenceCache('civil:test', [{ id: '1', text: 'مادة' }]);
        const rows = readLegalReferenceCache<{ id: string; text: string }>('civil:test');
        expect(rows).toEqual([{ id: '1', text: 'مادة' }]);
    });

    it('يُعلِن staleness بعد TTL', () => {
        vi.useFakeTimers();
        writeLegalReferenceCache('execution-law', [{ number: 1 }]);
        expect(isLegalReferenceCacheStale('execution-law', LEGAL_REFERENCE_DEFAULT_TTL_MS)).toBe(false);

        vi.advanceTimersByTime(LEGAL_REFERENCE_DEFAULT_TTL_MS + 1);
        expect(isLegalReferenceCacheStale('execution-law', LEGAL_REFERENCE_DEFAULT_TTL_MS)).toBe(true);
        vi.useRealTimers();
    });
});
