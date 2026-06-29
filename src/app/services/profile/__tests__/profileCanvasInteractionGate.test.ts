import { describe, expect, it, beforeEach } from 'vitest';
import {
    getActiveProfileCanvasSlot,
    releaseProfileCanvasSlot,
    resetProfileCanvasSlotForTests,
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
});
