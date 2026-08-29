import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    pushCriminalLocalOverlayBack,
    tryPopCriminalLocalOverlayBack,
    resetCriminalLocalOverlayBackStackForTests,
    criminalLocalOverlayBackStackDepthForTests,
} from '../criminalLocalOverlayBackStack';

describe('criminalLocalOverlayBackStack', () => {
    beforeEach(() => {
        resetCriminalLocalOverlayBackStackForTests();
    });

    it('tryPop returns false when empty', () => {
        expect(tryPopCriminalLocalOverlayBack()).toBe(false);
        expect(criminalLocalOverlayBackStackDepthForTests()).toBe(0);
    });

    it('consumes LIFO — last push wins', () => {
        const first = vi.fn(() => true);
        const second = vi.fn(() => true);
        pushCriminalLocalOverlayBack(first);
        const unregisterSecond = pushCriminalLocalOverlayBack(second);
        expect(tryPopCriminalLocalOverlayBack()).toBe(true);
        expect(second).toHaveBeenCalledTimes(1);
        expect(first).not.toHaveBeenCalled();
        // محاكاة cleanup بعد إغلاق الطبقة (كما في الـ hooks)
        unregisterSecond();
        expect(tryPopCriminalLocalOverlayBack()).toBe(true);
        expect(first).toHaveBeenCalledTimes(1);
    });

    it('skips closers that return false and continues down the stack', () => {
        const lower = vi.fn(() => true);
        const upper = vi.fn(() => false);
        pushCriminalLocalOverlayBack(lower);
        pushCriminalLocalOverlayBack(upper);
        expect(tryPopCriminalLocalOverlayBack()).toBe(true);
        expect(upper).toHaveBeenCalledTimes(1);
        expect(lower).toHaveBeenCalledTimes(1);
    });

    it('unregister removes the closer', () => {
        const closer = vi.fn(() => true);
        const unregister = pushCriminalLocalOverlayBack(closer);
        expect(criminalLocalOverlayBackStackDepthForTests()).toBe(1);
        unregister();
        expect(criminalLocalOverlayBackStackDepthForTests()).toBe(0);
        expect(tryPopCriminalLocalOverlayBack()).toBe(false);
        expect(closer).not.toHaveBeenCalled();
    });
});
