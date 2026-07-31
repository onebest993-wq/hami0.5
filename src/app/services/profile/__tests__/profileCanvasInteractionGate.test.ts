import { describe, expect, it, beforeEach } from 'vitest';
import {
    getActiveProfileCanvasSlot,
    releaseProfileCanvasSlot,
    resetProfileCanvasSlotForTests,
    subscribeProfileCanvasSlot,
    tryClaimProfileCanvasSlot,
} from '@/app/services/profile/profileCanvasInteractionGate';

describe('profileCanvasInteractionGate', () => {
    beforeEach(() => {
        resetProfileCanvasSlotForTests();
    });

    it('يسمح بكتلة واحدة نشطة', () => {
        expect(tryClaimProfileCanvasSlot('block-a')).toBe(true);
        expect(getActiveProfileCanvasSlot()).toBe('block-a');
        expect(tryClaimProfileCanvasSlot('block-b')).toBe(false);
    });

    it('يحرّر slot عند release', () => {
        tryClaimProfileCanvasSlot('block-a');
        releaseProfileCanvasSlot('block-a');
        expect(getActiveProfileCanvasSlot()).toBeNull();
        expect(tryClaimProfileCanvasSlot('block-b')).toBe(true);
    });

    it('إعادة claim لنفس الكتلة لا تُحدث حلقة notify', () => {
        let depth = 0;
        const unsub = subscribeProfileCanvasSlot(() => {
            depth += 1;
            if (depth > 40) throw new Error('notify recursion');
            tryClaimProfileCanvasSlot('block-a');
        });
        expect(() => tryClaimProfileCanvasSlot('block-a')).not.toThrow();
        expect(depth).toBeLessThan(5);
        unsub();
    });
});
