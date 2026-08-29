import { describe, expect, it } from 'vitest';
import {
    peekPublicVerifiedBadge,
    resetPublicVerifiedBadgeStoreForTests,
    writePublicVerifiedBadge,
} from '../publicVerifiedBadgeStore';

describe('publicVerifiedBadgeStore', () => {
    it('لا يفترض العلامة من غياب القيمة', () => {
        resetPublicVerifiedBadgeStoreForTests();
        expect(peekPublicVerifiedBadge('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).toBe(false);
        writePublicVerifiedBadge('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', true);
        expect(peekPublicVerifiedBadge('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).toBe(true);
        writePublicVerifiedBadge('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', false);
        expect(peekPublicVerifiedBadge('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).toBe(false);
        resetPublicVerifiedBadgeStoreForTests();
        expect(peekPublicVerifiedBadge('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).toBe(false);
    });
});
